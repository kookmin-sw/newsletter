import type { Manifest } from './core.js';

export type AssetUrl = (path: string, manifest: Manifest) => string;

async function prepareImages(manifest: Manifest, assetUrl: AssetUrl, signal: AbortSignal, decoded: Set<string>) {
  // Decode sequentially so a large playlist does not decode hundreds of images at once.
  for (const asset of manifest.assets.filter((a) => /\.(png|jpe?g|webp|svg)$/i.test(a.path))) {
    signal.throwIfAborted();
    if (decoded.has(asset.sha256)) continue;
    const image = new Image();
    const abort = () => { image.src = ''; };
    signal.addEventListener('abort', abort, { once: true });
    try { image.src = assetUrl(asset.path, manifest); await image.decode(); signal.throwIfAborted(); decoded.add(asset.sha256); }
    finally { signal.removeEventListener('abort', abort); image.src = ''; }
  }
}

export function fontFamily(manifest: Manifest) {
  return 'Signage-' + [manifest.branding.fontRegular, manifest.branding.fontBold]
    .map((path) => manifest.assets.find((asset) => asset.path === path)!.sha256).join('-');
}

async function loadFonts(manifest: Manifest, assetUrl: AssetUrl, signal: AbortSignal) {
  const fonts: FontFace[] = [];
  for (const [path, weight] of [[manifest.branding.fontRegular, '400'], [manifest.branding.fontBold, '700']]) {
    const response = await fetch(assetUrl(path, manifest), { signal });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`글꼴 수신 실패: ${response.status}`); }
    const font = new FontFace(fontFamily(manifest), await response.arrayBuffer(), { weight });
    fonts.push(await font.load());
    signal.throwIfAborted();
  }
  return fonts;
}

interface Fonts { users: number; controller: AbortController; promise: Promise<FontFace[]>; faces?: FontFace[] }
interface Entry { hashes: string[]; controller: AbortController; promise: Promise<void>; release?: () => void }

export class AssetCache {
  private entries = new Map<string, Entry>();
  private fonts = new Map<string, Fonts>();
  private decoded = new Set<string>();

  private async acquireFonts(manifest: Manifest, assetUrl: AssetUrl, signal: AbortSignal) {
    signal.throwIfAborted();
    const family = fontFamily(manifest);
    let shared = this.fonts.get(family);
    if (!shared) {
      const controller = new AbortController();
      shared = { users: 0, controller, promise: Promise.resolve([]) };
      const record = shared;
      this.fonts.set(family, record);
      record.promise = loadFonts(manifest, assetUrl, controller.signal).then((faces) => {
        controller.signal.throwIfAborted();
        record.faces = faces;
        faces.forEach((font) => document.fonts.add(font));
        return faces;
      });
    }
    const record = shared;
    record.users++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      signal.removeEventListener('abort', release);
      if (--record.users === 0) {
        if (this.fonts.get(family) === record) this.fonts.delete(family);
        record.controller.abort();
        record.faces?.forEach((font) => document.fonts.delete(font));
      }
    };
    signal.addEventListener('abort', release, { once: true });
    try { await record.promise; signal.throwIfAborted(); return release; }
    catch (error) { release(); throw error; }
  }
  has(revision: string) { return !!this.entries.get(revision)?.release; }

  prepare(manifest: Manifest, assetUrl: AssetUrl): Promise<void> {
    const existing = this.entries.get(manifest.revision);
    if (existing) return existing.promise;
    const controller = new AbortController();
    const entry: Entry = { hashes: manifest.assets.filter((a) => /\.(png|jpe?g|webp|svg)$/i.test(a.path)).map((a) => a.sha256), controller, promise: Promise.resolve() };
    this.entries.set(manifest.revision, entry);
    const timeout = setTimeout(() => controller.abort(new Error('콘텐츠 준비 시간 초과')), 30000);
    entry.promise = prepareImages(manifest, assetUrl, controller.signal, this.decoded)
      .then(() => this.acquireFonts(manifest, assetUrl, controller.signal)).then((release) => {
      if (controller.signal.aborted) { release(); controller.signal.throwIfAborted(); }
      entry.release = release;
    }).catch((error) => {
      if (this.entries.get(manifest.revision) === entry) this.entries.delete(manifest.revision);
      throw error;
    }).finally(() => clearTimeout(timeout));
    return entry.promise;
  }

  retain(revisions: Iterable<string>) {
    const keep = new Set(revisions);
    for (const [revision, entry] of this.entries) if (!keep.has(revision)) {
      this.entries.delete(revision);
      entry.controller.abort();
      entry.release?.();
    }
    const hashes = new Set([...this.entries.values()].flatMap((entry) => entry.hashes));
    for (const hash of this.decoded) if (!hashes.has(hash)) this.decoded.delete(hash);
  }
}
