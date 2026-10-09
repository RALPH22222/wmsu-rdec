import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the provider's hooks with session events and controlled network replies.
const slots = [];
let cursor = 0;
let effects = [];
let dirty = false;
let view;
let auth = { loading: false, session: { access_token: 'token-a', user: { id: 'a' } }, profile: { id: 'a', role: 'PROPONENT' } };
const calls = [];
let proposalReads = 0;
const listeners = new Map();
const changed = (previous, next) => !previous || previous.some((value, index) => !Object.is(value, next[index]));
const react = {
  createContext: () => ({ Provider: 'provider' }),
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => {
      slots[index] = typeof value === 'function' ? value(slots[index]) : value;
      dirty = true;
    }];
  },
  useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  useCallback(callback, deps) {
    const index = cursor++;
    if (changed(slots[index]?.deps, deps)) slots[index] = { deps, callback };
    return slots[index].callback;
  },
  useEffect(effect, deps) {
    const index = cursor++;
    if (changed(slots[index]?.deps, deps)) {
      effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  },
};
const modules = {
  react: { __esModule: true, default: react, ...react },
  './AuthContext': { useAuth: () => auth },
  '../data/mockData': { MOCK_USERS: [{}], MOCK_PROPOSALS: [] },
  '../config/apiConfig': { API_ENDPOINTS: {} },
  '../lib/callApi': { fetchCalls: (token) => new Promise((resolve) => calls.push({ token, resolve })) },
  '../lib/conceptProposalApi': { getMyConceptProposalsApi: async () => { proposalReads++; return []; } },
  '../lib/screeningApi': { getScreeningProposals: async () => { proposalReads++; return []; } },
  '../utils/callWindow': { applyCallWindow: (call) => call },
};
const source = readFileSync(new URL('../src/context/CallForProposalsContext.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports, require: (name) => { assert.ok(modules[name], name); return modules[name]; },
  console, localStorage: { removeItem() {} },
  window: { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: (name) => listeners.delete(name) },
});
let renderComponent = () => exports.CallForProposalsProvider({ children: null });
function render() {
  cursor = 0;
  dirty = false;
  view = renderComponent();
  const pending = effects;
  effects = [];
  pending.forEach((effect) => effect());
}
async function settle() {
  for (let count = 0; count < 8; count++) {
    await Promise.resolve();
    if (dirty) render();
  }
}
render();
await settle();
assert.equal(calls.length, 1);
assert.equal(view.props.value.loadingCalls, true);
calls[0].resolve([]);
await settle();
assert.equal(view.props.value.loadingCalls, false);

// Tab focus confirms the same session and returns a fresh profile object.
auth = { ...auth, session: { ...auth.session, user: { ...auth.session.user } }, profile: { ...auth.profile } };
listeners.get('focus')();
render();
await settle();
assert.equal(calls.length, 1, 'Focus must not refetch calls for an unchanged session');
assert.equal(proposalReads, 1, 'An equivalent profile must not refetch submissions');
assert.equal(view.props.value.loadingCalls, false);

auth = { ...auth, session: { ...auth.session, access_token: 'token-refreshed' } };
render();
await settle();
assert.equal(calls.length, 2);
assert.equal(calls[1].token, 'token-refreshed');
assert.equal(view.props.value.loadingCalls, false, 'Token refresh should keep cards visible');
calls[1].resolve([]);
await settle();

auth = { loading: false, session: { access_token: 'token-b', user: { id: 'b' } }, profile: { id: 'b', role: 'PROPONENT' } };
render();
await settle();
assert.equal(calls.length, 3);
assert.equal(view.props.value.loadingCalls, true, 'A different account must load its own data');
calls[2].resolve([]);
await settle();
const manualRefresh = view.props.value.refreshCalls();
await settle();
assert.equal(calls.length, 4);
assert.equal(view.props.value.loadingCalls, true, 'Explicit refresh should retain its loading state');
calls[3].resolve([]);
await manualRefresh;
await settle();
auth = { ...auth, profile: { ...auth.profile, role: 'EVALUATOR' } };
render();
await settle();
assert.equal(calls.length, 5, 'A changed role must refresh permission-dependent counts');
calls[4].resolve([]);
await settle();
console.log('Passed: focus preserves calls, token refresh runs silently, account/role changes and manual refresh still load.');

const trackingRequests = [];
const trackingModules = {
  react: modules.react,
  'react-router-dom': {},
  'lucide-react': {},
  '../context/AuthContext': { useAuth: () => auth },
  '../config/apiConfig': { API_ENDPOINTS: { RPDU: { TRACKING: '/tracking' } } },
};
const trackingSource = readFileSync(new URL('../src/components/ProposalTracking.tsx', import.meta.url), 'utf8');
const trackingCompiled = ts.transpileModule(trackingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const trackingExports = {};
vm.runInNewContext(trackingCompiled, {
  exports: trackingExports, React: react, AbortController, console,
  require: (name) => { assert.ok(trackingModules[name], name); return trackingModules[name]; },
  fetch: (_url, options) => new Promise((resolve) => trackingRequests.push({ options, resolve: () => resolve({ ok: true, json: async () => ({ success: true, data: [] }) }) })),
});
slots.length = 0;
effects = [];
renderComponent = () => trackingExports.ProposalTracking({ role: 'rpdu' });
render();
await settle();
assert.equal(view.props['aria-busy'], true);
trackingRequests[0].resolve();
await settle();
assert.equal(view.props['aria-busy'], false);
auth = { ...auth, session: { ...auth.session }, profile: { ...auth.profile } };
render();
await settle();
assert.equal(trackingRequests.length, 1, 'Tracking must not reload on equivalent session confirmation');
auth = { ...auth, session: { ...auth.session, access_token: 'tracking-refreshed' } };
render();
await settle();
assert.equal(trackingRequests.length, 2);
assert.equal(trackingRequests[1].options.headers.Authorization, 'Bearer tracking-refreshed');
assert.equal(view.props['aria-busy'], false, 'Tracking token refresh must preserve the table, including an empty result');
trackingRequests[1].resolve();
await settle();
auth = { ...auth, session: { access_token: 'tracking-other', user: { id: 'other' } } };
render();
await settle();
assert.equal(view.props['aria-busy'], true, 'Tracking must show loading for a new account');
trackingRequests[2].resolve();
await settle();
view.props.children[0].props.children[1].props.onClick();
await settle();
assert.equal(trackingRequests.length, 4);
assert.equal(view.props['aria-busy'], true, 'Tracking manual refresh must show the skeleton');
trackingRequests[3].resolve();
await settle();
assert.equal(view.props['aria-busy'], false);
console.log('Passed: tracking keeps the table visible on focus/token refresh and loads for new accounts/manual refresh.');
