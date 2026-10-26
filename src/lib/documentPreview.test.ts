import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentPreview } from './documentPreview.ts';

test('document previews support signed PDF and image URLs without trusting query strings', () => {
  const pdf = 'https://files.example.test/proposal.PDF?token=signed#page=2';
  assert.deepEqual(documentPreview(pdf), { url: pdf, kind: 'pdf' });
  for (const extension of ['jpg', 'JPEG', 'png', 'webp', 'gif']) {
    assert.equal(documentPreview(`https://files.example.test/revision.${extension}?token=signed`)?.kind, 'image');
  }
  assert.equal(documentPreview('https://files.example.test/proposal%2Epdf')?.kind, 'pdf');
  assert.equal(documentPreview('https://files.example.test/proposal.docx?name=image.png')?.kind, 'download');
  assert.equal(documentPreview('https://files.example.test/file.svg')?.kind, 'download');
});

test('document previews reject unsafe or invalid URLs', () => {
  for (const url of [null, undefined, '', '/proposal.pdf', 'invalid', 'http://files.example.test/proposal.pdf', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://files.example.test/%zz.pdf']) {
    assert.equal(documentPreview(url), null);
  }
});
