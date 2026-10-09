import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';

function load(path, modules, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, React, URL, ...globals, require(name) { assert.ok(modules[name], name); return modules[name]; } });
  return exports;
}
const proposal = {
  id: '12345678-1234-4234-8234-123456789abc', title: 'Research proposal', code: 'CP-2026-12345678',
  college: 'College of Computing', department: 'Computer Science', leadInvestigator: 'Maria Santos',
  leadInvestigatorEmail: 'maria@example.test', callTitle: 'Call', submittedAt: '2026-01-01',
  thematicArea: 'Technology', screeningStatus: 'pending', attachments: [{ name: 'proposal.pdf', type: 'PDF', dataUrl: '/uploads/proposal.pdf' }],
};
let navigation;
const restored = { viewMode: 'table', searchQuery: '', statusFilter: 'all', thematicFilter: 'all', collegeFilter: 'all' };
const manager = load('../src/pages/rpdu/PreliminaryScreeningManager.tsx', {
  react: { __esModule: true, default: React, useState: (initial) => [initial, () => {}], useMemo: (compute) => compute() },
  'react-router-dom': { useNavigate: () => (...args) => { navigation = args; }, useLocation: () => ({ state: { screeningList: restored } }) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '../../context/CallForProposalsContext': { useCallForProposals: () => ({ conceptProposals: [proposal], loadingConceptProposals: false }) },
});
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
const text = (node) => Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
for (const role of ['rpdu', 'admin']) {
  const tree = manager.PreliminaryScreeningManager({ role });
  const table = nodes(tree).find((node) => node.type === 'table');
  const buttons = nodes(table).filter((node) => node.type === 'button');
  assert.equal(buttons.length, 1);
  assert.equal(text(buttons[0]), 'Review Files');
  buttons[0].props.onClick();
  assert.equal(navigation[0], `/${role}/screening/${proposal.id}`);
  assert.deepEqual(JSON.parse(JSON.stringify(navigation[1].state.screeningList)), restored);
  for (const viewMode of ['cards', 'table']) {
    for (const status of ['pending', 'passed', 'failed']) {
      restored.viewMode = viewMode;
      restored.statusFilter = status;
      proposal.screeningStatus = status;
      const list = manager.PreliminaryScreeningManager({ role });
      assert.equal(nodes(list).some((node) => node.type === 'button' && /^(Pass|Fail)(\s|$)/.test(text(node))), false, 'List actions cannot bypass file review');
      assert.ok(nodes(list).some((node) => node.type === 'button' && text(node).startsWith('Review Files')));
    }
  }
  restored.viewMode = 'table'; restored.statusFilter = 'all'; proposal.screeningStatus = 'pending';
}

const requests = [];
let succeeds = true;
const api = load('../src/lib/screeningApi.ts', {
  '../config/apiConfig': { API_BASE_URL: 'https://api.example/api', API_ENDPOINTS: { RPDU: { SCREENING: 'https://api.example/api/screening/proposals' } } },
}, {
  fetch: async (url, options) => {
    requests.push({ url, options });
    return { ok: succeeds, json: async () => succeeds ? { success: true, data: proposal } : { success: false, message: 'Unable to save' } };
  },
});
const actual = await api.getScreeningProposal(proposal.id, 'token');
assert.equal(requests[0].url, `https://api.example/api/screening/proposals/${proposal.id}`);
assert.equal(requests[0].options.headers.Authorization, 'Bearer token');
assert.equal(actual.attachments[0].dataUrl, 'https://api.example/uploads/proposal.pdf');
await api.saveScreeningProposal(proposal.id, 'FAIL', 'Revise the budget', 'token');
assert.deepEqual(JSON.parse(requests[1].options.body), { decision: 'FAIL', remarks: 'Revise the budget' });
assert.equal(requests[1].options.method, 'PUT');
succeeds = false;
await assert.rejects(api.saveScreeningProposal(proposal.id, 'PASS', '', 'token'), /Unable to save/);

const comments = load('../src/lib/screeningComments.ts', {});
const sections = { title: 'Focus the title.\n\nOverall remarks:\n> Keep this literal.', rationaleSignificance: 'Add local data.', objectives: 'Make outcomes measurable.', estimatedBudget: 'Itemize costs.' };
const encoded = comments.formatScreeningComments('Revise and resubmit.', sections);
const decoded = comments.readScreeningComments(encoded);
assert.equal(decoded.overall, 'Revise and resubmit.');
assert.deepEqual(JSON.parse(JSON.stringify(decoded.sections)), sections);
assert.equal(comments.readScreeningComments('Legacy feedback').overall, 'Legacy feedback');
assert.equal(comments.formatScreeningComments('  Overall only  ', {}), 'Overall only');
assert.equal(comments.readScreeningComments('Pre-screening section feedback\n\nMalformed').overall, 'Pre-screening section feedback\n\nMalformed');

// Exercise the actual review form, including draft switching and reloading saved feedback.
let slots = [], cursor = 0, effects = [], dirty = false, reviewTree;
let stored = { ...proposal, screeningRemarks: '' };
const saves = [];
const hooks = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; dirty = true; }];
  },
  useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
      effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  },
};
const review = load('../src/pages/screening/ScreeningReviewPage.tsx', {
  react: hooks,
  'react-router-dom': { Link: 'a', useParams: () => ({ proposalId: proposal.id }), useLocation: () => ({ state: null }) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '../../context/AuthContext': { useAuth: () => ({ session: { access_token: 'token', user: { id: 'staff' } } }) },
  '../../context/CallForProposalsContext': { useCallForProposals: () => ({ refreshConceptProposals: async () => {} }) },
  '../../lib/screeningComments': comments,
  '../../lib/screeningApi': {
    getScreeningProposal: async () => stored,
    saveScreeningProposal: async (id, decision, remarks) => {
      saves.push({ id, decision, remarks });
      return stored = { ...stored, screeningStatus: decision === 'PASS' ? 'passed' : 'failed', screeningRemarks: remarks };
    },
  },
}, { AbortController });
function renderReview() {
  cursor = 0; dirty = false;
  reviewTree = review.ScreeningReviewPage({ role: 'rpdu' });
  const pending = effects; effects = []; pending.forEach((effect) => effect());
}
async function settleReview() {
  for (let i = 0; i < 10; i++) { await Promise.resolve(); if (dirty) renderReview(); }
}
function choose(value) {
  nodes(reviewTree).find((node) => node.type === 'input' && node.props.value === value).props.onChange();
  renderReview();
}
function enter(label, value) {
  const field = nodes(reviewTree).find((node) => node.type === 'label' && text(node).startsWith(label));
  nodes(field).find((node) => node.type === 'textarea').props.onChange({ target: { value } });
  renderReview();
}
async function submit() {
  await nodes(reviewTree).find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await settleReview();
}
function press(label) {
  const button = nodes(reviewTree).find((node) => node.type === 'button' && text(node) === label);
  assert.ok(button && !button.props.disabled, `${label} is available`);
  assert.equal(button.props.type, 'button', 'Step navigation must not submit');
  button.props.onClick(); renderReview();
}
function goToFailStep(target) {
  const labels = [...comments.screeningCommentSections.map((section) => section.label), 'Overall summary'];
  for (let i = 0; i < labels.length; i++) {
    const field = nodes(reviewTree).find((node) => node.type === 'label' && nodes(node).some((child) => child.type === 'textarea'));
    const current = labels.findIndex((label) => text(field).startsWith(label));
    assert.ok(current >= 0);
    if (current === target) return;
    press(current < target ? 'Next' : 'Back');
  }
  assert.fail('Unable to reach comment step');
}
renderReview(); await settleReview();
assert.equal(text(reviewTree).includes(proposal.code), false, 'Proposal ID is hidden beside the status');
assert.ok(text(reviewTree).includes('Preliminary-screening information'));
assert.equal(nodes(reviewTree).some((node) => node.type === 'span' && text(node) === 'Preliminary-screening'), false, 'Standalone label beside status is removed');
for (const label of ['Endorsement form', 'Concept proposal']) {
  const tab = nodes(reviewTree).find((node) => node.type === 'button' && text(node) === label);
  tab.props.onClick(); renderReview();
  const selected = nodes(reviewTree).find((node) => node.type === 'button' && text(node) === label);
  assert.equal(selected.props['aria-pressed'], true);
  assert.ok(selected.props.className.includes('bg-[#C8102E]'), 'Active document tab uses the red theme');
}
choose('FAIL');
assert.equal(nodes(reviewTree).filter((node) => node.type === 'textarea').length, 1, 'Fail shows one comment at a time');
assert.equal(nodes(reviewTree).find((node) => node.type === 'button' && text(node) === 'Back').props.disabled, true);
assert.equal(nodes(reviewTree).some((node) => node.type === 'button' && node.props.type === 'submit'), false, 'Save appears only on the last Fail step');
await submit();
assert.equal(saves.length, 0, 'Submitting an intermediate step advances without saving');
assert.ok(text(reviewTree).includes('Step 2 of 5'));
goToFailStep(4); await submit();
assert.equal(saves.length, 0, 'Fail requires feedback');
goToFailStep(0);
enter('Title', sections.title);
press('Next'); press('Back');
assert.equal(nodes(reviewTree).find((node) => node.type === 'textarea').props.value, sections.title, 'Back preserves section drafts');
choose('PASS'); enter('Pass comments', 'Proceed with the detailed proposal.');
choose('FAIL');
assert.equal(nodes(reviewTree).find((node) => node.type === 'textarea').props.value, sections.title, 'Switching decisions preserves drafts');
goToFailStep(4);
assert.equal(nodes(reviewTree).some((node) => node.type === 'button' && text(node) === 'Next'), false, 'Last step has no Next button');
await submit();
assert.equal(saves[0].decision, 'FAIL');
assert.equal(comments.readScreeningComments(saves[0].remarks).sections.title, sections.title, 'Section-only fail comments save');
choose('PASS'); await submit();
assert.equal(saves[1].remarks, 'Proceed with the detailed proposal.', 'Pass saves only its own comment');
choose('FAIL');
for (const [index, { key, label }] of comments.screeningCommentSections.entries()) {
  goToFailStep(index); enter(label, sections[key]);
}
goToFailStep(4);
enter('Overall summary', 'Revise and resubmit.');
await submit();
assert.equal(saves[2].remarks, encoded);
slots = []; effects = []; renderReview(); await settleReview();
assert.equal(nodes(reviewTree).filter((node) => node.type === 'textarea').length, 1);
for (const [index, { key, label }] of comments.screeningCommentSections.entries()) {
  goToFailStep(index);
  const field = nodes(reviewTree).find((node) => node.type === 'label' && text(node).startsWith(label));
  assert.equal(nodes(field).find((node) => node.type === 'textarea').props.value, sections[key], 'Saved section comments reopen correctly');
}
goToFailStep(4);
assert.equal(nodes(reviewTree).find((node) => node.type === 'textarea').props.value, 'Revise and resubmit.');
goToFailStep(0); enter('Title', 'a'.repeat(5000)); goToFailStep(4); await submit();
assert.equal(saves.length, 3, 'Oversized combined feedback is rejected before saving');
console.log('Passed: review links, files, Pass comments, Fail Back/Next steps and drafts, save/reopening, validation, hidden ID, and Preliminary-screening labels.');
