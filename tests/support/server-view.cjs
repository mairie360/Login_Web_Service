const Module = require('node:module');

// Renders the real page components with react-dom/server and keeps the hook state of every function
// component between two render passes, so that the HTML reflects what useEffect loaded from the mocked
// BFFs. No DOM: a pass is `renderToStaticMarkup`, effects run after the pass (children first), a state
// update schedules the next pass in a microtask. The stub installed by `installReactRuntime` must be in
// place before any module importing `react` (src/, @mairie360/lib-components) is loaded.
//
//   mount(<Page />)  ->  pass 1 (loading HTML)  ->  effects: fetch the BFF  ->  setState  ->  pass 2 (loaded HTML)
//
// Hooks that keep state (useState, useReducer, useRef, useMemo, useCallback, useEffect and the layout
// variants) are served by this runner while a wrapped component renders; every other hook (useContext,
// useId, useSyncExternalStore, ...) goes to React's own server implementation.
//
// Like React, a component function runs again only when its own state changed or when its parent ran again
// (it then receives a new props object); otherwise its previous output is reused as is, so the elements it
// created keep their identity and effects depending on them do not fire. A component that keeps updating
// its state on every pass is reported as a render loop instead of hanging the test.

const real = require('react');
const { jsx, jsxs } = require('react/jsx-runtime');
const { renderToStaticMarkup } = require('react-dom/server');

const FRAGMENT = Symbol.for('react.fragment');
const MEMO = Symbol.for('react.memo');
const FORWARD_REF = Symbol.for('react.forward_ref');
const LAZY = Symbol.for('react.lazy');
const WRAPPED = Symbol('server-view.wrapped');
const MAX_PASSES_WITHOUT_IDLE = 100;
const MAX_RENDER_PHASE_UPDATES = 25;

let current = null;

function depsChanged(previous, next) {
  return !previous || !next || previous.length !== next.length || previous.some((value, index) => !Object.is(value, next[index]));
}

function slot(instance) {
  const index = instance.cursor++;
  return { index, existing: index in instance.slots, get: () => instance.slots[index], set: (value) => { instance.slots[index] = value; } };
}

const runnerHooks = {
  useState(initial) {
    const instance = current;
    const cell = slot(instance);
    if (!cell.existing) cell.set(typeof initial === 'function' ? initial() : initial);
    const setState = instance.setters[cell.index] ??= (value) => {
      const previous = instance.slots[cell.index];
      const next = typeof value === 'function' ? value(previous) : value;
      if (Object.is(next, previous)) return;
      instance.slots[cell.index] = next;
      if (current === instance) instance.renderPhaseUpdate = true;
      else instance.view.invalidate(instance);
    };
    return [cell.get(), setState];
  },
  useReducer(reducer, initialArg, init) {
    const instance = current;
    const cell = slot(instance);
    if (!cell.existing) cell.set(init ? init(initialArg) : initialArg);
    const dispatch = instance.setters[cell.index] ??= (action) => {
      const previous = instance.slots[cell.index];
      const next = reducer(previous, action);
      if (Object.is(next, previous)) return;
      instance.slots[cell.index] = next;
      if (current === instance) instance.renderPhaseUpdate = true;
      else instance.view.invalidate(instance);
    };
    return [cell.get(), dispatch];
  },
  useRef(initial) {
    const cell = slot(current);
    if (!cell.existing) cell.set({ current: initial });
    return cell.get();
  },
  useMemo(factory, deps) {
    const cell = slot(current);
    const previous = cell.get();
    if (cell.existing && !depsChanged(previous.deps, deps)) return previous.value;
    const value = factory();
    cell.set({ deps, value });
    return value;
  },
  useCallback(callback, deps) {
    return runnerHooks.useMemo(() => callback, deps);
  },
  useEffect(effect, deps) {
    const instance = current;
    const cell = slot(instance);
    const previous = cell.get();
    if (cell.existing && !depsChanged(previous.deps, deps)) return;
    cell.set({ deps, cleanup: previous?.cleanup, effect: true });
    instance.effectSlots.add(cell.index);
    instance.pendingEffects.push(() => {
      const state = instance.slots[cell.index];
      state.cleanup?.();
      state.cleanup = effect() ?? undefined;
    });
  },
  useImperativeHandle(ref, create, deps) {
    runnerHooks.useEffect(() => {
      if (!ref) return undefined;
      if (typeof ref === 'function') { ref(create()); return () => ref(null); }
      ref.current = create();
      return () => { ref.current = null; };
    }, deps);
  },
};
runnerHooks.useLayoutEffect = runnerHooks.useEffect;
runnerHooks.useInsertionEffect = runnerHooks.useEffect;

function stubModule(request, exports) {
  const filename = require.resolve(request);
  const stub = new Module(filename);
  stub.filename = filename;
  stub.exports = exports;
  stub.loaded = true;
  require.cache[filename] = stub;
}

/** A `react` module whose stateful hooks are served by the runner while a wrapped component renders. */
function buildReactStub() {
  const stub = {};
  for (const key of Reflect.ownKeys(real)) Object.defineProperty(stub, key, Object.getOwnPropertyDescriptor(real, key));
  for (const [name, hook] of Object.entries(runnerHooks)) stub[name] = (...args) => (current ? hook(...args) : real[name](...args));
  return stub;
}

/** Minimal App Router for `next/navigation`: navigations are recorded instead of performed. */
function buildRouter(pathname) {
  const router = { pathname, pushes: [], replaces: [], refreshes: 0 };
  router.push = (href) => { router.pushes.push(href); };
  router.replace = (href) => { router.replaces.push(href); };
  router.refresh = () => { router.refreshes += 1; };
  router.back = () => {};
  router.forward = () => {};
  router.prefetch = () => {};
  router.reset = () => { router.pushes.length = 0; router.replaces.length = 0; router.refreshes = 0; };
  return router;
}

let installed = null;

/**
 * Installs the `react` stub and a recording `next/navigation`. Call it once, before loading any page
 * module. Returns the recording router (`router.pushes`, `router.replaces`).
 */
function installReactRuntime({ pathname = '/' } = {}) {
  if (installed) return installed;
  const router = buildRouter(pathname);
  stubModule('react', buildReactStub());
  stubModule('next/navigation', {
    useRouter: () => router,
    usePathname: () => router.pathname,
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    redirect: (href) => { throw new Error(`redirect(${href})`); },
    notFound: () => { throw new Error('notFound()'); },
  });
  installed = { router };
  return installed;
}

/**
 * Recreates an element through the JSX runtime: array children are static, so keys are not re-validated,
 * and the props are copied because React's dev build leaves a warning `key` getter on the original object.
 */
function createElement(type, props, key) {
  return (Array.isArray(props.children) ? jsxs : jsx)(type, { ...props }, key ?? undefined);
}

/** `child` is rendered under `parent` (paths are `<parent><separator>...`). */
function isDescendant(child, parent) {
  return child.startsWith(parent) && '/>.['.includes(child[parent.length]);
}

/** Text an element carries itself: its string/number children, through nested host elements and arrays. */
function staticText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(staticText).join('');
  if (real.isValidElement(node) && (typeof node.type === 'string' || node.type === FRAGMENT)) return staticText(node.props.children);
  return '';
}

function displayName(type) {
  return type.displayName || type.name || 'Anonymous';
}

/** Turns a memo / forwardRef type into a plain function component. */
function unwrapType(type) {
  if (typeof type === 'function') return type.prototype?.isReactComponent ? null : type;
  if (type && typeof type === 'object') {
    if (type.$$typeof === MEMO) return unwrapType(type.type);
    if (type.$$typeof === FORWARD_REF) {
      const render = type.render;
      const component = (props) => render(props, props.ref ?? null);
      component.displayName = displayName(render);
      return component;
    }
  }
  return null;
}

class Instance {
  constructor(view, path, name) {
    this.view = view;
    this.path = path;
    this.name = name;
    this.slots = [];
    this.setters = [];
    this.effectSlots = new Set();
    this.pendingEffects = [];
    this.cursor = 0;
    this.props = null;
    this.output = undefined;
    this.hosts = [];
    this.dirty = false;
    this.renderPhaseUpdate = false;
    this.mounted = false;
    this.renders = 0;
  }

  cleanupAll() {
    for (const index of [...this.effectSlots].reverse()) {
      const state = this.slots[index];
      state?.cleanup?.();
      if (state) state.cleanup = undefined;
    }
  }
}

class ServerView {
  constructor(element) {
    this.root = element;
    this.instances = new Map();
    this.wrappers = new Map();
    this.visited = [];
    this.rootHosts = [];
    this.hostSink = this.rootHosts;
    this.html = '';
    this.passes = 0;
    this.passesSinceIdle = 0;
    this.error = null;
    this.dirty = false;
    this.scheduled = false;
    this.unmounted = false;
    this.render();
  }

  /** Text content of the last HTML (tags removed, entities decoded), for readable assertions. */
  text() {
    return this.html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Instances rendered by the last pass whose component is named `name` (display name or function name). */
  find(name) {
    return this.visited.filter((instance) => instance.name === name);
  }

  /** Props received by the `index`-th rendered instance of `name` during the last pass. */
  props(name, index = 0) {
    const instance = this.find(name)[index];
    if (!instance) throw new Error(`server-view: no rendered component named ${name} (rendered: ${[...new Set(this.visited.map((i) => i.name))].join(', ')})`);
    return instance.props;
  }

  invalidate(instance) {
    if (this.unmounted || !this.instances.has(instance.path)) return;
    instance.dirty = true;
    this.dirty = true;
    if (this.passesSinceIdle > MAX_PASSES_WITHOUT_IDLE) {
      this.error ??= new Error(`server-view: render loop, ${instance.name} keeps updating its state (${this.passesSinceIdle} passes without the event loop turning)`);
      return;
    }
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      if (this.unmounted || !this.dirty) return;
      try {
        this.render();
      } catch (error) {
        this.error = error;
      }
    });
  }

  /** One render pass: `renderToStaticMarkup` with the stored hook state, then effects (children first). */
  render() {
    if (this.unmounted) throw new Error('server-view: the view is unmounted');
    this.dirty = false;
    this.visited = [];
    this.rootHosts = [];
    this.hostSink = this.rootHosts;
    // The root element is wrapped once: its props keep their identity, so the root component only runs again
    // when its own state changed, like any other component.
    this.wrappedRoot ??= this.wrap(this.root, '');
    this.html = renderToStaticMarkup(this.wrappedRoot);
    this.passes += 1;
    this.passesSinceIdle += 1;

    for (const [path, instance] of this.instances) {
      if (instance.mounted && !this.visited.includes(instance)) {
        instance.cleanupAll();
        this.instances.delete(path);
      }
    }

    const stack = [];
    const flush = (until) => {
      while (stack.length && !(until && isDescendant(until.path, stack[stack.length - 1].path))) {
        const instance = stack.pop();
        instance.mounted = true;
        for (const run of instance.pendingEffects.splice(0)) run();
      }
    };
    for (const instance of this.visited) {
      flush(instance);
      stack.push(instance);
    }
    flush(null);
    return this.html;
  }

  /** Waits (real event loop, mocked BFFs are real HTTP servers) until `predicate(html, view)` holds. */
  async waitFor(predicate, { timeout = 3000 } = {}) {
    const deadline = Date.now() + timeout;
    for (;;) {
      await this.settle();
      if (this.error) throw this.error;
      if (predicate(this.html, this)) return this.html;
      if (Date.now() > deadline) throw new Error(`server-view: condition not reached after ${this.passes} render pass(es); text was: ${this.text().slice(0, 400)}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  /**
   * Host elements (`<button>`, `<input>`, ...) of the last pass matching `match`: a string or RegExp
   * tested against the element's own static text, or a predicate `(props, text, tag) => boolean`.
   */
  hostElements(match) {
    const test = typeof match === 'function' ? match : (props, text) => (match instanceof RegExp ? match.test(text) : text.includes(match));
    return this.hosts.filter(({ type, props, text }) => test(props, text, type));
  }

  /** Host elements of the last pass, in render order (cached subtrees keep the elements of their last run). */
  get hosts() {
    return [...this.rootHosts, ...this.visited.flatMap((instance) => instance.hosts)];
  }

  /** Calls the `handler` prop (e.g. `onClick`) of the first host element matching `match`, then re-renders. */
  fire(match, handler, event = {}) {
    const element = this.hostElements((props, text, tag) => typeof props[handler] === 'function' && this.hostElements(match).some((candidate) => candidate.props === props && candidate.type === tag))[0];
    if (!element) {
      const candidates = this.hosts.filter(({ props }) => typeof props[handler] === 'function').map(({ type, text }) => `<${type}> ${JSON.stringify(text.slice(0, 40))}`);
      throw new Error(`server-view: no host element with ${handler} matching ${String(match)} (candidates: ${candidates.join(', ') || 'none'})`);
    }
    const synthetic = { preventDefault() {}, stopPropagation() {}, target: { value: '' }, currentTarget: { value: '' }, ...event };
    return this.act(() => element.props[handler](synthetic));
  }

  click(match, event = {}) {
    return this.fire(match, 'onClick', event);
  }

  /** Runs a user interaction (a prop callback) and lets the pending state updates render. */
  async act(interaction) {
    const result = await interaction();
    await this.settle();
    await new Promise((resolve) => setImmediate(resolve));
    await this.settle();
    if (this.error) throw this.error;
    return result;
  }

  async settle() {
    while (this.scheduled) await new Promise((resolve) => setImmediate(resolve));
    this.passesSinceIdle = 0;
  }

  unmount() {
    if (this.unmounted) return;
    this.unmounted = true;
    for (const instance of [...this.visited].reverse()) instance.cleanupAll();
    this.instances.clear();
  }

  wrap(node, path) {
    if (Array.isArray(node)) return node.map((child, index) => this.wrap(child, `${path}[${child?.key ?? index}]`));
    if (!real.isValidElement(node) || node.type?.[WRAPPED]) return node;
    const { type, props, key } = node;
    const component = unwrapType(type);
    if (component) {
      const name = displayName(type.$$typeof === MEMO ? component : type);
      const instancePath = `${path}/${name}`;
      return createElement(this.wrapper(instancePath, name, component), this.wrapProps(props, instancePath), key);
    }
    const label = typeof type === 'string' ? type : type === FRAGMENT ? '' : displayName(type);
    if (typeof type === 'string') this.hostSink.push({ type, props, text: staticText(props.children) });
    const wrapped = this.wrapProps(props, `${path}/${label}`);
    return wrapped === props ? node : createElement(type, wrapped, key);
  }

  wrapProps(props, path) {
    let changed = false;
    const next = {};
    for (const [name, value] of Object.entries(props)) {
      const wrapped = real.isValidElement(value) || (Array.isArray(value) && value.some(real.isValidElement)) ? this.wrap(value, name === 'children' ? `${path}>` : `${path}.${name}`) : value;
      if (wrapped !== value) changed = true;
      next[name] = wrapped;
    }
    return changed ? next : props;
  }

  wrapper(path, name, component) {
    let Wrapper = this.wrappers.get(path);
    if (Wrapper) return Wrapper;
    const view = this;
    Wrapper = function ServerViewWrapper(props) {
      let instance = view.instances.get(path);
      if (!instance) {
        instance = new Instance(view, path, name);
        view.instances.set(path, instance);
      }
      view.visited.push(instance);
      // Same props object as last time and no state change: React would not run the component either.
      if (instance.output !== undefined && !instance.dirty && props === instance.props) return instance.output;
      instance.props = props;
      instance.dirty = false;
      instance.cursor = 0;
      instance.renders += 1;
      instance.hosts = [];
      const previousSink = view.hostSink;
      const previous = current;
      view.hostSink = instance.hosts;
      current = instance;
      try {
        // A state update during render re-runs the component at once, as React does, until it settles.
        let output;
        for (let attempt = 0; ; attempt += 1) {
          instance.renderPhaseUpdate = false;
          instance.cursor = 0;
          instance.pendingEffects.length = 0;
          output = component(props);
          if (!instance.renderPhaseUpdate) break;
          if (attempt >= MAX_RENDER_PHASE_UPDATES) throw new Error(`server-view: ${name} keeps updating its state while rendering`);
        }
        instance.output = view.wrap(output, path);
        return instance.output;
      } finally {
        current = previous;
        view.hostSink = previousSink;
      }
    };
    Wrapper.displayName = name;
    Wrapper[WRAPPED] = true;
    this.wrappers.set(path, Wrapper);
    return Wrapper;
  }
}

/** Minimal event target: listeners are recorded so a test can `dispatchEvent({ type, ... })`. */
function eventTarget(target) {
  const listeners = new Map();
  target.addEventListener = (type, listener) => { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)).add(listener); };
  target.removeEventListener = (type, listener) => { listeners.get(type)?.delete(listener); };
  target.dispatchEvent = (event) => {
    const synthetic = { preventDefault() {}, stopPropagation() {}, target, currentTarget: target, ...event };
    for (const listener of [...(listeners.get(event.type) ?? [])]) listener(synthetic);
    return true;
  };
  target.listeners = (type) => [...(listeners.get(type) ?? [])];
  return target;
}

/**
 * Effects of the library components touch `document` / `window` (listeners, viewport size, timers) when they
 * run in the browser. They run here in Node after each pass, so the missing globals get inert stand-ins.
 * `window.document` stays undefined: the components keep taking their server code paths (`canUseDOM`).
 */
function ensureBrowserGlobals() {
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = eventTarget({
      body: eventTarget({ style: {}, contains: () => false, classList: { add() {}, remove() {} } }),
      documentElement: { style: {}, clientWidth: 1280, clientHeight: 800 },
      activeElement: null,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {} }),
    });
  }
  const window = globalThis.window;
  if (!window || typeof window !== 'object') return;
  if (!window.addEventListener) eventTarget(window);
  window.innerWidth ??= 1280;
  window.innerHeight ??= 800;
  window.setTimeout ??= setTimeout;
  window.clearTimeout ??= clearTimeout;
  window.requestAnimationFrame ??= (callback) => setTimeout(() => callback(Date.now()), 0);
  window.cancelAnimationFrame ??= clearTimeout;
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.scrollTo ??= () => {};
  window.confirm ??= () => true;
}

/** Mounts `element` (a React element) and performs the first render pass synchronously. */
function mount(element) {
  if (!installed) throw new Error('server-view: call installReactRuntime() before mount()');
  ensureBrowserGlobals();
  return new ServerView(element);
}

module.exports = { installReactRuntime, mount, stubModule };
