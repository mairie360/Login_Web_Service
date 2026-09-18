const { readFileSync } = require('node:fs');

// Lecture du contrat OpenAPI 3.1 du BFF (contracts/openapi.json) et validation JSON Schema minimale.
// Portage CommonJS de BFFs/BFF_user/tests/support/openapi-contract.ts : le validateur ne couvre que
// les mots-clés émis par zod-to-openapi ; tout mot-clé inconnu fait échouer la validation plutôt
// que d'être ignoré.

const ANNOTATIONS = new Set(['description', 'example', 'examples', 'default', 'title', 'deprecated', 'readOnly', 'writeOnly']);
const HANDLED = new Set([
  '$ref', 'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'anyOf', 'allOf', 'oneOf',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'pattern', 'format',
]);
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

class OpenApiContract {
  constructor(document) {
    this.document = document;
  }

  static load(file) {
    return new OpenApiContract(JSON.parse(readFileSync(file, 'utf8')));
  }

  get title() { return this.document.info.title; }

  /** Toutes les opérations déclarées, sous la forme { method: 'GET', template, operation }. */
  operations() {
    return Object.entries(this.document.paths).flatMap(([template, item]) => Object.entries(item)
      .filter(([method]) => HTTP_METHODS.includes(method))
      .map(([method, operation]) => ({ method: method.toUpperCase(), template, operation })));
  }

  /** Trouve l'opération correspondant à un chemin concret (les chemins littéraux priment). */
  match(method, pathname) {
    const templates = Object.keys(this.document.paths)
      .sort((a, b) => (a.match(/\{/g)?.length ?? 0) - (b.match(/\{/g)?.length ?? 0));
    for (const template of templates) {
      const names = [];
      const pattern = template.split(/(\{[^}]+\})/).map((part) => {
        if (!part.startsWith('{')) return part.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
        names.push(part.slice(1, -1));
        return '([^/]+)';
      }).join('');
      const found = new RegExp(`^${pattern}$`).exec(pathname);
      const operation = this.document.paths[template][method.toLowerCase()];
      if (found && operation) {
        return { template, operation, pathParams: Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(found[i + 1])])) };
      }
    }
    return undefined;
  }

  /** Vérifie qu'une requête reçue correspond à une opération déclarée (chemin, méthode, paramètres). */
  validateRequest(method, url) {
    const match = this.match(method, url.pathname);
    if (!match) return { errors: [`${method} ${url.pathname} n'existe pas dans le contrat ${this.title}`], undeclaredQuery: [] };
    const errors = [];
    const parameters = match.operation.parameters ?? [];
    for (const parameter of parameters) {
      if (parameter.in !== 'path' && parameter.in !== 'query') continue;
      const raw = parameter.in === 'path' ? match.pathParams[parameter.name] : url.searchParams.get(parameter.name) ?? undefined;
      if (raw === undefined) {
        if (parameter.required) errors.push(`paramètre ${parameter.in} "${parameter.name}" requis manquant`);
        continue;
      }
      if (parameter.schema) errors.push(...this.validate(parameter.schema, coerceParameter(raw, parameter.schema), `${parameter.in}.${parameter.name}`));
    }
    const declared = new Set(parameters.filter((p) => p.in === 'query').map((p) => p.name));
    const undeclaredQuery = [...new Set(url.searchParams.keys())].filter((name) => !declared.has(name));
    return { match, errors, undeclaredQuery };
  }

  /** Statut documenté (code exact, sinon plage `2XX`…), schéma JSON et en-têtes déclarés de la réponse. */
  responseSchema(match, status) {
    const responses = match.operation.responses ?? {};
    const response = responses[String(status)] ?? responses[`${String(status)[0]}XX`];
    return { documented: response !== undefined, schema: response?.content?.['application/json']?.schema, headers: response?.headers ?? {} };
  }

  /** Schéma JSON du corps de requête attendu par l'opération. */
  requestBodySchema(match) {
    const body = match.operation.requestBody;
    return { required: Boolean(body?.required), schema: body?.content?.['application/json']?.schema };
  }

  schema(name) {
    const schema = this.document.components?.schemas?.[name];
    if (!schema) throw new Error(`Schéma ${name} absent du contrat ${this.title}`);
    return schema;
  }

  validate(schema, value, at = '$') {
    for (const keyword of Object.keys(schema)) {
      if (!HANDLED.has(keyword) && !ANNOTATIONS.has(keyword)) {
        throw new Error(`Mot-clé JSON Schema non supporté par le validateur de test : ${keyword} (${at})`);
      }
    }
    if (typeof schema.$ref === 'string') return this.validate(this.resolve(schema.$ref), value, at);

    const errors = [];
    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((type) => hasType(value, type))) return [`${at}: type ${types.join('|')} attendu, reçu ${describe(value)}`];
    }
    if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => candidate === value)) {
      errors.push(`${at}: valeur ${JSON.stringify(value)} hors enum ${JSON.stringify(schema.enum)}`);
    }
    if (Array.isArray(schema.allOf)) {
      for (const sub of schema.allOf) errors.push(...this.validate(sub, value, at));
    }
    if (Array.isArray(schema.anyOf) && !schema.anyOf.some((sub) => this.validate(sub, value, at).length === 0)) {
      errors.push(`${at}: aucune alternative anyOf ne correspond à ${describe(value)}`);
    }
    if (Array.isArray(schema.oneOf) && schema.oneOf.filter((sub) => this.validate(sub, value, at).length === 0).length !== 1) {
      errors.push(`${at}: exactement une alternative oneOf doit correspondre à ${describe(value)}`);
    }
    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${at}: ${value} < minimum ${schema.minimum}`);
      if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${at}: ${value} > maximum ${schema.maximum}`);
      if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) errors.push(`${at}: ${value} <= exclusiveMinimum ${schema.exclusiveMinimum}`);
      if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) errors.push(`${at}: ${value} >= exclusiveMaximum ${schema.exclusiveMaximum}`);
    }
    if (typeof value === 'string') {
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) errors.push(`${at}: longueur < ${schema.minLength}`);
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) errors.push(`${at}: longueur > ${schema.maxLength}`);
      if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${at}: "${value}" ne respecte pas ${schema.pattern}`);
      if (typeof schema.format === 'string' && !matchesFormat(value, schema.format)) errors.push(`${at}: "${value}" n'est pas au format ${schema.format}`);
    }
    if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
      value.forEach((item, index) => errors.push(...this.validate(schema.items, item, `${at}[${index}]`)));
    }
    if (isObject(value)) {
      const properties = schema.properties ?? {};
      for (const name of schema.required ?? []) {
        if (!(name in value)) errors.push(`${at}.${name}: propriété requise manquante`);
      }
      for (const [name, propertyValue] of Object.entries(value)) {
        if (properties[name]) errors.push(...this.validate(properties[name], propertyValue, `${at}.${name}`));
        else if (schema.additionalProperties === false) errors.push(`${at}.${name}: propriété non autorisée`);
        else if (isObject(schema.additionalProperties)) errors.push(...this.validate(schema.additionalProperties, propertyValue, `${at}.${name}`));
      }
    }
    return errors;
  }

  /**
   * Construit une valeur minimale conforme au schéma (propriétés requises seulement), pour exercer
   * chaque opération du contrat sans écrire de fixture à la main.
   */
  sample(schema, name = 'value') {
    if (typeof schema.$ref === 'string') return this.sample(this.resolve(schema.$ref), name);
    if (schema.example !== undefined && this.validate(schema, schema.example).length === 0) return schema.example;
    if (Array.isArray(schema.enum)) return schema.enum[0];
    if (Array.isArray(schema.anyOf)) return this.sample(schema.anyOf[0], name);
    if (Array.isArray(schema.oneOf)) return this.sample(schema.oneOf[0], name);
    if (Array.isArray(schema.allOf)) return Object.assign({}, ...schema.allOf.map((sub) => this.sample(sub, name)));
    const type = Array.isArray(schema.type) ? schema.type.find((candidate) => candidate !== 'null') ?? 'null' : schema.type;
    switch (type) {
      case 'null': return null;
      case 'boolean': return true;
      case 'integer':
      case 'number': {
        const floor = typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum + 1 : schema.minimum ?? 1;
        return Math.max(1, floor);
      }
      case 'string':
        if (schema.format === 'email') return `${name}@mairie360.test`;
        if (schema.format === 'date') return '2026-09-15';
        if (schema.format === 'date-time') return '2026-09-15T08:00:00Z';
        if (schema.format === 'uri') return 'https://mairie360.test/';
        return name.padEnd(schema.minLength ?? 1, 'x');
      case 'array': return schema.items ? [this.sample(schema.items, name)] : [];
      case 'object':
      default: {
        if (type === undefined && !schema.properties) return {};
        const properties = schema.properties ?? {};
        return Object.fromEntries((schema.required ?? []).map((key) => [key, properties[key] ? this.sample(properties[key], key) : key]));
      }
    }
  }

  resolve(ref) {
    const prefix = '#/components/schemas/';
    if (!ref.startsWith(prefix)) throw new Error(`$ref non supportée : ${ref}`);
    return this.schema(ref.slice(prefix.length));
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasType(value, type) {
  switch (type) {
    case 'null': return value === null;
    case 'array': return Array.isArray(value);
    case 'object': return isObject(value);
    case 'integer': return Number.isInteger(value);
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    default: return typeof value === type;
  }
}

function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesFormat(value, format) {
  switch (format) {
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'uri': try { new URL(value); return true; } catch { return false; }
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(value);
    case 'date-time': return !Number.isNaN(Date.parse(value));
    default: return true;
  }
}

/** Les paramètres de chemin/query arrivent en chaîne : conversion selon le type déclaré. */
function coerceParameter(raw, schema) {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if ((types.includes('number') || types.includes('integer')) && raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  if (types.includes('boolean') && (raw === 'true' || raw === 'false')) return raw === 'true';
  return raw;
}

module.exports = { OpenApiContract };
