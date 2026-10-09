const Module = require('node:module');

/** Execute the existing TS loader without Next's build-only CSS/font transforms.
 * React, the real root component and its providers remain unmocked.
 * This helper does not verify style, font metrics or browser geometry.
 */
function loadRootLayout(load) {
  const previousCss = require.extensions['.css'];
  const previousLoad = Module._load;
  const font = options => ({ variable: options.variable, className: 'test-font' });
  require.extensions['.css'] = () => {};
  Module._load = function (request, ...rest) {
    if (request === 'next/font/google') return { Geist: font, Geist_Mono: font };
    return previousLoad.call(this, request, ...rest);
  };
  try {
    return load();
  } finally {
    Module._load = previousLoad;
    if (previousCss) require.extensions['.css'] = previousCss;
    else delete require.extensions['.css'];
  }
}

module.exports = { loadRootLayout };
