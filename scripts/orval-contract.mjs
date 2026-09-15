import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

// Reconstruit le contrat OpenAPI de BFF User à partir du paquet @mairie360/bff-user-openapi installé
// (sortie orval : endpoints/*.ts + model/*.ts, sans openapi.json). Le contrat utilisé par le front est
// donc celui de la version publiée épinglée dans package.json, jamais une copie d'un checkout du BFF.
// Portage ESM de BFFs/BFF_user/tests/support/orval-contract.ts (même lecture, mêmes limites).
//
// Ce que la sortie orval ne conserve pas, et que ce contrat ne peut donc pas vérifier :
// - le statut de succès est exposé sous la plage `2XX` ; les erreurs référencées (ApiErrorResponse) ne
//   sont pas rattachées à leur opération. Seuls les modèles orval nommés `<OperationId><statut>`
//   (ex. PostAuthLogin412) documentent un statut précis ;
// - les formats (email, date-time), les exemples et les en-têtes de réponse disparaissent ;
// - les noms de paramètres de chemin sont ceux d'orval.
// Les contraintes JSDoc (`@minimum`, `@minLength`, `@pattern`…), `@nullable`, les champs optionnels et
// les enums sont conservés.

export const PACKAGE_NAME = '@mairie360/bff-user-openapi';
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

export function resolveOrvalPackage(packageName = PACKAGE_NAME, root = process.cwd()) {
  const require = createRequire(path.join(root, 'package.json'));
  const dir = path.dirname(require.resolve(`${packageName}/package.json`));
  const { name, version } = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  return { name, version, dir };
}

/** Document OpenAPI 3.1 reconstruit, sérialisable tel quel dans contracts/openapi.json. */
export function buildOrvalOpenApi(packageName = PACKAGE_NAME, root = process.cwd()) {
  const pkg = resolveOrvalPackage(packageName, root);
  const models = readModels(path.join(pkg.dir, 'model'));
  const paths = {};
  let title = pkg.name;
  let version = pkg.version;

  for (const file of tsFiles(path.join(pkg.dir, 'endpoints'))) {
    const source = parse(file);
    const header = /\*\s*(\S+)\s*\n\s*\*\s*OpenAPI spec version:\s*(\S+)/.exec(source.text);
    if (header) [, title, version] = header;
    visit(source, (node) => {
      if (!ts.isVariableDeclaration(node) || !node.initializer || !ts.isArrowFunction(node.initializer)) return;
      const operation = readOperation(node.name.getText(), node.initializer, models);
      if (!operation) return;
      paths[operation.template] ??= {};
      paths[operation.template][operation.method] = operation.operation;
    });
  }
  if (Object.keys(paths).length === 0) throw new Error(`Aucune opération orval trouvée dans ${pkg.name}@${pkg.version}`);

  return sortKeys({
    openapi: '3.1.0',
    info: { title, version, 'x-source-package': `${pkg.name}@${pkg.version}` },
    paths,
    components: { schemas: models.schemas },
  });
}

function readModels(dir) {
  const models = { schemas: {}, aliases: {} };
  for (const file of tsFiles(dir)) {
    const source = parse(file);
    const enumValues = new Map();
    const enumAliases = [];

    for (const statement of source.statements) {
      if (ts.isInterfaceDeclaration(statement)) {
        models.schemas[statement.name.text] = objectSchema(statement.members);
      } else if (ts.isTypeAliasDeclaration(statement)) {
        if (ts.isTypeLiteralNode(statement.type)) {
          models.aliases[statement.name.text] = objectSchema(statement.type.members);
          models.schemas[statement.name.text] ??= models.aliases[statement.name.text];
        } else if (ts.isIndexedAccessTypeNode(statement.type)) {
          enumAliases.push(statement.name.text);
        } else {
          models.schemas[statement.name.text] ??= typeSchema(statement.type);
        }
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          const initializer = declaration.initializer && ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : undefined;
          if (initializer && ts.isObjectLiteralExpression(initializer)) {
            enumValues.set(declaration.name.getText(), initializer.properties
              .filter(ts.isPropertyAssignment)
              .map((property) => (ts.isStringLiteral(property.initializer) ? property.initializer.text : property.initializer.getText())));
          }
        }
      }
    }

    // `export type X = typeof X[keyof typeof X]` + `export const X = {...} as const` : enum orval.
    for (const name of enumAliases) {
      const values = enumValues.get(name);
      if (!values) throw new Error(`Enum orval ${name} sans constante associée (${file})`);
      models.schemas[name] = { type: 'string', enum: values };
    }
  }
  return models;
}

function readOperation(operationId, fn, models) {
  // Opération orval : `const x = (...): Promise<AxiosResponse<T>> => axiosInstance.<méthode>(...)`.
  // La fabrique `getBffUser` et les helpers `getXUrl` n'ont pas ce type de retour.
  if (!fn.type || !/^Promise<AxiosResponse</.test(fn.type.getText())) return undefined;
  let call;
  visit(fn.body, (node) => {
    if (call || !ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.expression.getText() === 'axiosInstance' && HTTP_METHODS.has(node.expression.name.text)) call = node;
  });
  if (!call) return undefined;

  const method = call.expression.name.text;
  const fnParameters = new Map(fn.parameters.map((parameter) => [parameter.name.getText(), parameter]));
  const [urlArgument, secondArgument] = call.arguments;
  const pathNames = [];
  let template;
  if (ts.isNoSubstitutionTemplateLiteral(urlArgument) || ts.isStringLiteral(urlArgument)) {
    template = urlArgument.text;
  } else if (ts.isTemplateExpression(urlArgument)) {
    template = urlArgument.head.text + urlArgument.templateSpans.map((span) => {
      pathNames.push(span.expression.getText());
      return `{${span.expression.getText()}}${span.literal.text}`;
    }).join('');
  } else {
    throw new Error(`URL orval non littérale pour ${operationId}`);
  }

  const parameters = pathNames.map((name) => ({ name, in: 'path', required: true, schema: parameterType(fnParameters.get(name), operationId) }));

  const queryType = fnParameters.get('params')?.type;
  if (queryType) {
    const name = queryType.getText();
    const query = models.aliases[name] ?? models.schemas[name];
    if (!query) throw new Error(`Paramètres de requête ${name} introuvables pour ${operationId}`);
    const required = new Set(query.required ?? []);
    for (const [queryName, schema] of Object.entries(query.properties ?? {})) {
      parameters.push({ name: queryName, in: 'query', required: required.has(queryName), schema });
    }
  }

  // Corps : 2e argument pour post/put/patch, option `data` pour delete.
  let bodyName;
  if (['post', 'put', 'patch'].includes(method) && secondArgument && ts.isIdentifier(secondArgument)) bodyName = secondArgument.text;
  visit(call, (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'data' && ts.isIdentifier(node.initializer)) bodyName = node.initializer.text;
  });
  const bodyParameter = bodyName ? fnParameters.get(bodyName) : undefined;

  const responseType = withoutVoid(successType(fn.type, operationId));
  const isText = /responseType:\s*'text'/.test(call.getText());
  const responseSchema = responseType ? typeSchema(responseType) : undefined;

  const responses = {
    '2XX': {
      description: 'Succès (seul statut typé par orval)',
      ...(responseSchema ? { content: { [isText ? 'text/plain' : 'application/json']: { schema: responseSchema } } } : {}),
    },
  };
  // Modèles orval `<OperationId><statut>` : réponses non 2xx dont le schéma était déclaré en ligne.
  const prefix = operationId[0].toUpperCase() + operationId.slice(1);
  for (const name of Object.keys(models.schemas)) {
    const status = new RegExp(`^${prefix}([1-5]\\d\\d)$`).exec(name)?.[1];
    if (status && !status.startsWith('2')) {
      responses[status] = { description: `Réponse ${status} (modèle orval ${name})`, content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } } };
    }
  }

  const operation = { operationId, parameters, responses };
  if (bodyParameter?.type) {
    operation.requestBody = { required: !bodyParameter.questionToken, content: { 'application/json': { schema: typeSchema(bodyParameter.type) } } };
  }
  return { method, template, operation };
}

function parameterType(parameter, operationId) {
  if (!parameter?.type) throw new Error(`Type de paramètre de chemin absent pour ${operationId}`);
  return typeSchema(parameter.type);
}

/** Retire `void` d'un type de réponse (`T | void`) ; `undefined` si seul `void` reste. */
function withoutVoid(node) {
  if (!node || node.kind === ts.SyntaxKind.VoidKeyword) return undefined;
  if (!ts.isUnionTypeNode(node)) return node;
  const members = node.types.filter((member) => member.kind !== ts.SyntaxKind.VoidKeyword);
  if (members.length === 0) return undefined;
  return members.length === 1 ? members[0] : ts.factory.createUnionTypeNode(members);
}

/** `Promise<AxiosResponse<T>>` -> `T`. */
function successType(node, operationId) {
  const promise = node && ts.isTypeReferenceNode(node) ? node.typeArguments?.[0] : undefined;
  const response = promise && ts.isTypeReferenceNode(promise) && promise.typeName.getText() === 'AxiosResponse' ? promise.typeArguments?.[0] : undefined;
  if (!response) throw new Error(`Type de retour orval inattendu pour ${operationId}`);
  return response;
}

function objectSchema(members) {
  const properties = {};
  const required = [];
  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.type) continue;
    const name = member.name.getText().replace(/^['"]|['"]$/g, '');
    const schema = typeSchema(member.type);
    applyConstraints(schema, member);
    properties[name] = schema;
    if (!member.questionToken) required.push(name);
  }
  return { type: 'object', properties, required };
}

const NUMBER_CONSTRAINTS = new Set(['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum']);
const STRING_CONSTRAINTS = new Set(['minLength', 'maxLength', 'pattern']);

/** Reporte les contraintes JSDoc d'orval (`@minimum 0`, `@items.maximum 6`, `@pattern ^...$`) sur le schéma. */
function applyConstraints(schema, member) {
  const jsDoc = ts.getJSDocCommentsAndTags(member).map((node) => node.getText()).join('\n');
  for (const [, items, keyword, rawValue] of jsDoc.matchAll(/@(items\.)?(\w+)[ \t]+(.+?)[ \t]*(?:\*\/)?[ \t]*$/gm)) {
    let target = schema;
    if (items) {
      if (schema.type !== 'array' || !schema.items) continue;
      target = schema.items;
    }
    const types = Array.isArray(target.type) ? target.type : [target.type];
    if (NUMBER_CONSTRAINTS.has(keyword) && types.includes('number')) target[keyword] = Number(rawValue);
    else if (STRING_CONSTRAINTS.has(keyword) && types.includes('string')) target[keyword] = keyword === 'pattern' ? rawValue : Number(rawValue);
  }
}

function typeSchema(node) {
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword: return { type: 'string' };
    case ts.SyntaxKind.NumberKeyword: return { type: 'number' };
    case ts.SyntaxKind.BooleanKeyword: return { type: 'boolean' };
    case ts.SyntaxKind.UnknownKeyword:
    case ts.SyntaxKind.AnyKeyword: return {};
  }
  if (ts.isParenthesizedTypeNode(node)) return typeSchema(node.type);
  if (ts.isArrayTypeNode(node)) return { type: 'array', items: typeSchema(node.elementType) };
  if (ts.isTypeLiteralNode(node)) return objectSchema(node.members);
  if (ts.isLiteralTypeNode(node)) {
    if (node.literal.kind === ts.SyntaxKind.NullKeyword) return { type: 'null' };
    if (ts.isStringLiteral(node.literal)) return { type: 'string', enum: [node.literal.text] };
  }
  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText();
    if (name === 'Array' && node.typeArguments?.[0]) return { type: 'array', items: typeSchema(node.typeArguments[0]) };
    if (name === 'Record' && node.typeArguments?.[1]) return { type: 'object', additionalProperties: typeSchema(node.typeArguments[1]) };
    return { $ref: `#/components/schemas/${name}` };
  }
  if (ts.isIntersectionTypeNode(node)) return { allOf: node.types.map(typeSchema) };
  if (ts.isUnionTypeNode(node)) {
    const members = node.types.map(typeSchema);
    const simple = members.every((member) => Object.keys(member).length === 1 && typeof member.type === 'string');
    if (simple) return { type: [...new Set(members.map((member) => member.type))] };
    return { anyOf: members };
  }
  throw new Error(`Type orval non géré par le lecteur de contrat : ${node.getText()}`);
}

/** Tri récursif des clés d'objet (hors tableaux) pour un snapshot JSON stable. */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}

function tsFiles(dir) {
  return readdirSync(dir).filter((file) => file.endsWith('.ts')).sort().map((file) => path.join(dir, file));
}

function parse(file) {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ES2020, true);
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}
