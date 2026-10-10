import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';

const openCall = { id: 'current', title: 'Institutional Research Call 2026', startDate: '2026-10-08', endDate: '2026-10-10' };
const previous = { id: 'previous-proposal', callId: 'previous', callTitle: 'Previous call', title: 'Previous research', proponentId: 'person', leadInvestigatorEmail: 'person@example.test', thematicArea: 'Technology', attachments: [], screeningStatus: 'pending' };
const requests = [];
let context = { activeCall: openCall, loadingCalls: false, conceptProposals: [previous],
  showToast() {}, submitConceptProposal: async (payload) => { requests.push(payload); return { ...previous, ...payload, callTitle: openCall.title }; },
};
let auth = { user: { id: 'person', email: 'person@example.test', user_metadata: {} }, profile: { is_eligible_to_submit: true } };
let slots = [], cursor = 0, effects = [], dirty = false, tree;
const hooks = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; dirty = true; }];
  },
  useId() { return `input-${cursor++}`; },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
      effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  },
};
const modules = {
  react: { __esModule: true, default: React, ...hooks },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '../../context/CallForProposalsContext': { useCallForProposals: () => context },
  '../../context/AuthContext': { useAuth: () => auth },
};
const source = readFileSync(new URL('../src/components/proponentComponent/ConceptProposalSubmissionForm.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, React, document: { body: { style: { overflow: '' } } }, require: (name) => { assert.ok(modules[name], name); return modules[name]; } });
function render() {
  cursor = 0; dirty = false;
  tree = exports.ConceptProposalSubmissionForm();
  const pending = effects; effects = []; pending.forEach((effect) => effect());
}
async function settle() {
  for (let i = 0; i < 10; i++) { await Promise.resolve(); if (dirty) render(); }
}
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
const text = (node) => Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
const summary = () => nodes(tree).find((node) => node.props['aria-label'] === 'Current Call for Proposals');
const button = (label) => nodes(tree).find((node) => node.type === 'button' && text(node).startsWith(label));
async function fillAndConfirm() {
  nodes(tree).find((node) => node.type === 'textarea').props.onChange({ target: { value: 'Research on local agriculture' } });
  for (const input of nodes(tree).filter((node) => node.type === 'input' && node.props.type === 'file')) {
    input.props.onChange({ target: { files: [{ name: 'document.pdf', type: 'application/pdf', size: 1000 }] } });
  }
  await settle();
  nodes(tree).find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await settle();
}
render(); await settle();
assert.equal(nodes(summary()).some((node) => node.type === 'select' || node.type === 'input'), false);
assert.ok(text(summary()).includes(openCall.title));
assert.deepEqual(nodes(summary()).filter((node) => node.type === 'time').map((node) => node.props.dateTime), ['2026-10-08', '2026-10-10']);
assert.ok(text(summary()).includes('Oct 8, 2026'));
assert.ok(text(summary()).includes('Oct 10, 2026'));
assert.ok(text(summary()).includes('automatically'));
await fillAndConfirm();
assert.ok(button('Confirm & Submit'));
await button('Confirm & Submit').props.onClick(); await settle();
assert.equal(requests.length, 1);
assert.equal(requests[0].callId, openCall.id, 'Submission targets the current window automatically');

// A changed window invalidates confirmation and clears files rather than moving a proposal silently.
slots = []; effects = []; render(); await settle(); await fillAndConfirm();
context = { ...context, activeCall: { ...openCall, id: 'new-current', title: 'New current call' } };
render(); await settle();
assert.equal(button('Confirm & Submit'), undefined);
assert.equal(nodes(tree).find((node) => node.type === 'textarea').props.value, '');
assert.ok(text(summary()).includes('New current call'));
assert.equal(requests.length, 1);

context = { ...context, activeCall: null };
render(); await settle();
assert.ok(text(summary()).includes('No open Call for Proposals'));
assert.equal(nodes(tree).some((node) => node.type === 'form'), false);
assert.ok(button('Submit Concept Proposal').props.disabled);
assert.ok(text(tree).includes(previous.title), 'Past submissions remain accessible without a call selector');

context = { ...context, activeCall: openCall };
auth = { ...auth, profile: { is_eligible_to_submit: false } };
render(); await settle();
assert.ok(text(summary()).includes(openCall.title));
assert.ok(text(summary()).includes('Your account cannot submit'));
assert.equal(nodes(tree).some((node) => node.type === 'form'), false);
context = { ...context, loadingCalls: true };
render(); await settle();
assert.ok(text(summary()).includes('Loading current Call for Proposals'));
assert.equal(nodes(tree).some((node) => node.type === 'form'), false);
console.log('Passed: read-only current call, submission dates, automatic call ID, changed-window confirmation, no-open/loading/eligibility states, and access to past submissions.');
