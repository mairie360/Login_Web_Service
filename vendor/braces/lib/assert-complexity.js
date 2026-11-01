'use strict';

// Keep the recursive upstream walkers inside a small, fixed stack budget.
// Container depth excludes the root and terminal text/open/close nodes.
const MAX_DEPTH = 128;
const MAX_VISITS = 65536;

const reject = () => {
  const error = new SyntaxError('Brace pattern or AST exceeds safe structural limits');
  error.code = 'ERR_BRACES_COMPLEXITY';
  throw error;
};

const assertAst = ast => {
  const active = new Set();
  const pending = [{ node: ast, depth: 0, index: -1 }];
  let visits = 0;

  while (pending.length > 0) {
    const frame = pending[pending.length - 1];
    const node = frame.node;
    if (frame.index === -1) {
      if (++visits > MAX_VISITS || active.has(node)) reject();
      if (!node || typeof node !== 'object') throw new TypeError('Expected an AST node');
      if (!node.nodes) {
        pending.pop();
        continue;
      }
      if (!Array.isArray(node.nodes)) throw new TypeError('Expected an AST nodes array');
      if (frame.depth > MAX_DEPTH) reject();
      active.add(node);
      frame.index = 0;
    }
    if (frame.index === node.nodes.length) {
      active.delete(node);
      pending.pop();
      continue;
    }
    pending.push({ node: node.nodes[frame.index++], depth: frame.depth + 1, index: -1 });
  }
};

module.exports = { MAX_DEPTH, reject, assertAst };
