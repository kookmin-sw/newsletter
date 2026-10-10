import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetCache } from '../dist/assets.js';
import { fixture } from './fixture.mjs';

function browser(t) {
  const fonts = new Set();
  const images = new Set();
  let fontLoad = async (font) => font;
  let decodes = 0;
  t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array([1, 2])));
  const descriptors = ['document', 'Image', 'FontFace'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.document = { fonts };
  globalThis.Image = class {
    set src(value) { if (value) images.add(this); else images.delete(this); }
    async decode() { decodes++; }
  };
  globalThis.FontFace = class { async load() { return fontLoad(this); } };
  t.after(() => { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return { fonts, images, get decodes() { return decodes; }, load: (fn) => { fontLoad = fn; } };
}
const url = (path) => `https://example.com${path}`;

test('1,000번 갱신해도 활성 버전의 글꼴 두 개만 유지하며 중복 준비는 합친다', async (t) => {
  const env = browser(t);
  const { fonts, images } = env;
  let fontLoads = 0;
  env.load(async (font) => { fontLoads++; return font; });
  const cache = new AssetCache();
  for (let i = 0; i < 1000; i++) {
    const manifest = fixture(); manifest.revision = i.toString(16).padStart(64, '0');
    const first = cache.prepare(manifest, url);
    assert.equal(cache.prepare(manifest, url), first);
    await first;
    cache.retain([manifest.revision]);
    assert.equal(fonts.size, 2); assert.equal(images.size, 0);
    assert.ok(cache.has(manifest.revision));
  }
  assert.equal(fontLoads, 2);
  assert.equal(env.decodes, 1);
  cache.retain([]);
  assert.equal(fonts.size, 0);
});

test('두 번째 글꼴 실패 시 첫 글꼴도 등록하지 않고 재시도할 수 있다', async (t) => {
  const env = browser(t); const cache = new AssetCache(); const manifest = fixture();
  let calls = 0;
  env.load(async (font) => { if (++calls === 2) throw new Error('bad font'); return font; });
  await assert.rejects(cache.prepare(manifest, url), /bad font/);
  assert.equal(env.fonts.size, 0); assert.equal(cache.has(manifest.revision), false);
  env.load(async (font) => font);
  await cache.prepare(manifest, url);
  assert.equal(env.fonts.size, 2);
  cache.retain([]);
});

test('준비 도중 해제한 버전은 늦게 완료되어도 글꼴을 등록하지 않는다', async (t) => {
  const env = browser(t); const cache = new AssetCache(); const manifest = fixture();
  let finish; let started;
  const loading = new Promise((resolve) => { started = resolve; });
  env.load((font) => new Promise((resolve) => { finish = () => resolve(font); started(); }));
  const promise = cache.prepare(manifest, url);
  const rejected = assert.rejects(promise, /abort/i);
  await loading;
  cache.retain([]); finish(); await rejected;
  assert.equal(env.fonts.size, 0); assert.equal(cache.has(manifest.revision), false);
});

test('글꼴 파일이 바뀐 경우에만 새 글꼴을 로딩하고 이전 버전을 해제한다', async (t) => {
  const env = browser(t); const cache = new AssetCache();
  const previous = fixture(); const next = fixture(); next.revision = 'c'.repeat(64);
  next.assets.find((a) => a.path === next.branding.fontBold).sha256 = 'd'.repeat(64);
  await cache.prepare(previous, url); await cache.prepare(next, url);
  assert.equal(env.fonts.size, 4);
  cache.retain([next.revision]); assert.equal(env.fonts.size, 2);
  assert.equal(cache.has(previous.revision), false); assert.equal(cache.has(next.revision), true);
  cache.retain([]); assert.equal(env.fonts.size, 0);
});

test('한 버전의 준비를 취소해도 같은 글꼴을 기다리는 다른 버전은 완료된다', async (t) => {
  const env = browser(t); const cache = new AssetCache();
  let finish; let started; let calls = 0;
  const loading = new Promise((resolve) => { started = resolve; });
  env.load((font) => ++calls === 1 ? new Promise((resolve) => { finish = () => resolve(font); started(); }) : Promise.resolve(font));
  const previous = fixture(); const next = fixture(); next.revision = 'c'.repeat(64);
  const first = cache.prepare(previous, url);
  const rejected = assert.rejects(first, /abort/i);
  await loading;
  const second = cache.prepare(next, url);
  // Let the second request join the in-flight font load.
  await new Promise((resolve) => setImmediate(resolve));
  cache.retain([next.revision]); finish();
  await rejected; await second;
  assert.equal(calls, 2); assert.equal(env.fonts.size, 2);
  assert.ok(cache.has(next.revision));
  cache.retain([]); assert.equal(env.fonts.size, 0);
});


test('사용하지 않는 이미지의 디코딩 기록은 해제한다', async (t) => {
  const env = browser(t); const cache = new AssetCache();
  const first = fixture(); const second = fixture(); second.revision = 'c'.repeat(64);
  second.assets[0].sha256 = 'd'.repeat(64);
  await cache.prepare(first, url); await cache.prepare(second, url);
  assert.equal(env.decodes, 2);
  cache.retain([second.revision]);
  await cache.prepare(first, url);
  assert.equal(env.decodes, 3);
  cache.retain([]);
});
