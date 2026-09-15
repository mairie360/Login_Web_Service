const http = require('node:http');

// Faux BFF servi en HTTP réel : chaque requête reçue du front est vérifiée contre le contrat OpenAPI
// du BFF (chemin, méthode, paramètres, corps JSON), et chaque réponse mockée est validée contre le
// schéma du statut renvoyé. Les écarts sont collectés dans `violations`, que chaque test doit vider.
// Portage CommonJS de BFFs/BFF_user/tests/support/contract-mock-server.ts, avec en plus :
// - HEAD accepté sur une opération GET (Express répond à HEAD pour toute route GET) ;
// - `allowUndeclared` pour les rares chemins servis par le BFF mais absents de son contrat ;
// - `delayMs` pour simuler un BFF lent.

class ContractMockServer {
  constructor(service, contract) {
    this.service = service;
    this.contract = contract;
    this.requests = [];
    this.violations = [];
    this.handlers = new Map();
    this.undeclared = new Map();
    this.deviations = [];
    this.url = '';
  }

  async start() {
    this.server = http.createServer((req, res) => {
      this.handle(req, res).catch((error) => {
        // Une exception dans le mock ne doit pas tuer le runner : elle devient une violation.
        this.violations.push(`[${this.service}] erreur du mock : ${error instanceof Error ? error.message : String(error)}`);
        send(res, 500, JSON.stringify({ message: 'Erreur du mock' }));
      });
    });
    await new Promise((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${this.server.address().port}`;
    return this.url;
  }

  async stop() {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise((resolve) => this.server.close(() => resolve()));
    this.server = undefined;
  }

  /** Enregistre un handler ; le couple méthode/chemin doit exister dans le contrat du BFF. */
  on(method, template, handler) {
    if (!this.contract.document.paths[template]?.[method.toLowerCase()]) {
      throw new Error(`${method} ${template} n'est pas déclaré dans le contrat ${this.contract.title}`);
    }
    this.handlers.set(`${method.toUpperCase()} ${template}`, typeof handler === 'function' ? handler : () => handler);
    return this;
  }

  /** Sert un chemin absent du contrat mais réellement exposé par le BFF ; l'exception doit être justifiée. */
  allowUndeclared(method, pathname, reason, reply) {
    if (!reason.trim()) throw new Error('Un chemin hors contrat doit être justifié');
    this.undeclared.set(`${method.toUpperCase()} ${pathname}`, reply);
    return this;
  }

  /** Accepte un écart connu entre le contrat et le comportement réel ; chaque exception doit être justifiée. */
  allowDeviation(pattern, reason) {
    if (!reason.trim()) throw new Error('Un écart de contrat accepté doit être justifié');
    this.deviations.push({ pattern, reason });
    return this;
  }

  reset() {
    this.requests.length = 0;
    this.violations.length = 0;
    this.handlers.clear();
  }

  calls(template, method) {
    return this.requests.filter((request) => request.template === template && (!method || request.method === method.toUpperCase()));
  }

  violation(message) {
    if (!this.deviations.some(({ pattern }) => pattern.test(message))) this.violations.push(message);
  }

  async handle(req, res) {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', this.url);
    const rawBody = await readBody(req);

    const undeclared = this.undeclared.get(`${method} ${url.pathname}`);
    if (undeclared) {
      this.requests.push({ method, url, path: url.pathname, template: url.pathname, pathParams: {}, headers: req.headers, undeclaredQuery: [], rawBody });
      return this.reply(req, res, method, undeclared);
    }

    // HEAD n'est jamais déclaré : il est validé comme le GET correspondant.
    const contractMethod = method === 'HEAD' && !this.contract.match('HEAD', url.pathname) ? 'GET' : method;
    const { match, errors, undeclaredQuery } = this.contract.validateRequest(contractMethod, url);
    errors.forEach((error) => this.violation(`[${this.service}] requête ${method} ${url.pathname}${url.search} : ${error}`));
    if (!match) return send(res, 404, JSON.stringify({ message: 'Route absente du contrat' }));

    let body;
    const { required, schema: bodySchema } = this.contract.requestBodySchema(match);
    if (rawBody.length > 0 && bodySchema) {
      try { body = JSON.parse(rawBody.toString('utf8')); } catch { this.violation(`[${this.service}] requête ${method} ${match.template} : corps JSON invalide`); }
    } else if (rawBody.length > 0) {
      this.violation(`[${this.service}] requête ${method} ${match.template} : corps envoyé à une opération qui n'en déclare pas`);
    } else if (required) {
      this.violation(`[${this.service}] requête ${method} ${match.template} : corps requis manquant`);
    }
    if (bodySchema && body !== undefined) {
      this.contract.validate(bodySchema, body, '$body').forEach((error) => this.violation(`[${this.service}] requête ${method} ${match.template} ${error}`));
    }

    const request = { method, url, path: url.pathname, template: match.template, pathParams: match.pathParams, headers: req.headers, undeclaredQuery, body, rawBody };
    this.requests.push(request);
    const handler = this.handlers.get(`${contractMethod} ${match.template}`);
    if (!handler) {
      this.violations.push(`[${this.service}] appel non mocké : ${method} ${match.template}`);
      return send(res, 500, JSON.stringify({ message: 'Appel non mocké' }));
    }

    const reply = handler(request);
    if (!reply.outOfContract && !reply.dropConnection) {
      const status = reply.status ?? 200;
      const { documented, schema } = this.contract.responseSchema(match, status);
      if (!documented) this.violation(`[${this.service}] ${method} ${match.template} : statut ${status} non documenté`);
      if (schema && reply.raw === undefined) {
        this.contract.validate(schema, reply.body).forEach((error) => this.violation(`[${this.service}] réponse ${status} ${method} ${match.template} ${error}`));
      }
      if (!schema && documented && reply.body !== undefined) {
        this.violation(`[${this.service}] réponse ${status} ${method} ${match.template} : corps renvoyé alors que le contrat n'en déclare pas`);
      }
    }
    return this.reply(req, res, method, reply);
  }

  async reply(req, res, method, reply) {
    if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
    if (reply.dropConnection) return void req.socket.destroy();
    const payload = reply.raw ?? (reply.body === undefined ? '' : JSON.stringify(reply.body));
    return send(res, reply.status ?? 200, method === 'HEAD' ? '' : payload, reply.contentType, reply.headers);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, payload, contentType = 'application/json', headers = {}) {
  if (res.headersSent || res.destroyed) return;
  res.writeHead(status, { ...(payload ? { 'Content-Type': contentType } : {}), ...headers });
  res.end(payload);
}

/** Retourne une URL sur laquelle rien n'écoute (port libéré juste après attribution). */
async function unreachableUrl() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}

module.exports = { ContractMockServer, unreachableUrl };
