import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const js = ts.transpileModule(readFileSync(new URL('./image-loading.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { trackImage } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
class Image extends EventTarget {
  dataset = {};
  complete = false;
  naturalWidth = 0;
  classes = new Set();
  classList = { add: value => this.classes.add(value), remove: value => this.classes.delete(value) };
}
test('loading completes once and removes shimmer', () => {
  const image = new Image();trackImage(image);trackImage(image);
  assert.equal(image.dataset.imageState, 'pending');
  image.naturalWidth = 800;image.dispatchEvent(new Event('load'));
  assert.equal(image.dataset.imageState, 'loaded');
  assert(!image.classes.has('image-pending'));assert(image.classes.has('image-enter'));
  image.dispatchEvent(new Event('error'));assert.equal(image.dataset.imageState, 'loaded');
});
test('errors stop loading; cached images do not flash', () => {
  const image = new Image();trackImage(image);image.dispatchEvent(new Event('error'));
  assert.equal(image.dataset.imageState, 'error');assert(!image.classes.has('image-pending'));
  const cached = new Image();cached.complete = true;cached.naturalWidth = 800;trackImage(cached);
  assert.equal(cached.dataset.imageState, 'loaded');assert.equal(cached.classes.size, 0);
  const broken = new Image();broken.complete = true;trackImage(broken);
  assert.equal(broken.dataset.imageState, 'error');
});
