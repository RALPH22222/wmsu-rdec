import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentPreview, documentPreviewKind, documentViewerHref } from './documentPreview.ts';

test('document previews support signed PDF and image URLs without trusting query strings', () => {
  const pdf = 'https://files.example.test/proposal.PDF?token=signed#page=2';
  assert.deepEqual(documentPreview(pdf), { url: pdf, kind: 'pdf' });
  for (const extension of ['jpg', 'JPEG', 'png', 'webp', 'gif']) {
    assert.equal(documentPreview(`https://files.example.test/revision.${extension}?token=signed`)?.kind, 'image');
  }
  assert.equal(documentPreview('https://files.example.test/proposal%2Epdf')?.kind, 'pdf');
  assert.equal(documentPreview('https://files.example.test/proposal.docx?name=image.png')?.kind, 'docx');
  assert.equal(documentPreview('https://files.example.test/file.svg')?.kind, 'download');
});

test('document previews render .docx and flag legacy .doc by path, never by query string', () => {
  const docx = 'https://project.supabase.co/storage/v1/object/sign/proposals/concept/abc.DOCX?token=signed';
  assert.deepEqual(documentPreview(docx), { url: docx, kind: 'docx' });
  assert.equal(documentPreview('https://files.example.test/My%20Proposal%20v2.docx')?.kind, 'docx');
  assert.equal(documentPreview('https://files.example.test/legacy.doc?token=signed')?.kind, 'doc');
  assert.equal(documentPreview('https://files.example.test/legacy.DOC')?.kind, 'doc');
  assert.equal(documentPreview('https://files.example.test/proposal.pdf?name=file.docx')?.kind, 'pdf');
  assert.equal(documentPreview('https://files.example.test/file.docm')?.kind, 'download');
  assert.equal(documentPreview('https://files.example.test/file.docx.zip')?.kind, 'download');
});

test('documentPreviewKind classifies plain file names', () => {
  assert.equal(documentPreviewKind('Concept Proposal.docx'), 'docx');
  assert.equal(documentPreviewKind('endorsement.doc'), 'doc');
  assert.equal(documentPreviewKind('endorsement.pdf'), 'pdf');
  assert.equal(documentPreviewKind('photo.png'), 'image');
  assert.equal(documentPreviewKind('notes.txt'), 'download');
  assert.equal(documentPreviewKind(''), 'download');
});

test('document previews reject unsafe or invalid URLs', () => {
  for (const url of [null, undefined, '', '/proposal.pdf', 'invalid', 'http://files.example.test/proposal.pdf', 'http://files.example.test/proposal.docx', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://files.example.test/%zz.pdf']) {
    assert.equal(documentPreview(url), null);
  }
});

test('documentViewerHref routes .docx to standalone viewer and leaves PDFs/images as direct storage URLs', () => {
  const docxUrl = 'https://project.supabase.co/storage/v1/object/sign/proposals/concept.docx?token=123';
  assert.equal(
    documentViewerHref(docxUrl, 'concept.docx'),
    `/preview/document?url=${encodeURIComponent(docxUrl)}&name=concept.docx`
  );

  const pdfUrl = 'https://project.supabase.co/storage/v1/object/sign/proposals/endorsement.pdf?token=123';
  assert.equal(documentViewerHref(pdfUrl, 'endorsement.pdf'), pdfUrl);

  assert.equal(documentViewerHref(null), '#');
});
