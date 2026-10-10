import { app, BrowserWindow, ipcMain, protocol, screen, Menu, globalShortcut, powerSaveBlocker, powerMonitor, session } from 'electron';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialTimelines, scheduleManifest, playbackAt, getSession, validateManifest } from '@kmucs/signage-player';
import { atomicJson, readJson, fetchManifest, cacheAssets, assetName, digest, feedUrl, pruneAssets, validateAssignments, validateTimelines } from './storage.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const development = !app.isPackaged && process.argv.includes('--dev');
const demo = development && process.argv.includes('--demo');
app.setName(development ? 'KMUCS Signage Dev' : 'KMUCS Signage');
const source = feedUrl(process.env.SIGNAGE_FEED_URL ?? (development ? 'http://localhost:4321/signage/feed.json' : 'https://alumni.cs.kookmin.ac.kr/signage/feed.json'), development);
const players = new Map();
let setupWindow;
let settings = { assignments: [], autoStart: false };
let timelines = {};
let latest = null;
let candidate = null;
let lastError = '';
let lastChecked = null;
let fetching = false;
let pruning = false;
let cacheDirty = true;
let quitting = false;
let changingWindows = false;
let blocker;
let cacheDirectory;
let dataDirectory;
let saveChain = Promise.resolve();
let clockEpoch = Date.now();
let clockOrigin = performance.now();
const now = () => clockEpoch + performance.now() - clockOrigin;

protocol.registerSchemesAsPrivileged([{ scheme: 'signage', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => openSetup());
  app.whenReady().then(start).catch((error) => { console.error(error); app.quit(); });
}

function displayList() {
  return screen.getAllDisplays().map((d, index) => ({ id: d.id, label: d.label || `모니터 ${index + 1}`, bounds: d.bounds, scaleFactor: d.scaleFactor, rotation: d.rotation }));
}

function snapshot(record) {
  return {
    timelines, candidate: candidate?.manifest ?? null,
    settings, displays: displayList(), lastError, lastChecked,
    preparing: fetching || !!candidate, source: source.href,
    assignment: record?.assignment ?? null,
    cacheDirectory, version: app.getVersion(),
  };
}

function broadcast() {
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.webContents.send('state', snapshot());
  for (const record of players.values()) if (!record.window.isDestroyed()) record.window.webContents.send('state', snapshot(record));
}

function persist() {
  const value = JSON.parse(JSON.stringify({ timelines, latest }));
  saveChain = saveChain.catch(() => {}).then(() => atomicJson(join(dataDirectory, 'playback.json'), value));
  return saveChain;
}

function report(error) {
  lastError = error instanceof Error ? error.message : String(error);
  console.error(lastError);
  broadcast();
}

function secureWindow(options) {
  const window = new BrowserWindow({
    backgroundColor: '#050505', show: false, autoHideMenuBar: true,
    ...options,
    webPreferences: { preload: join(directory, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, devTools: development },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' || input.key === 'Escape') event.preventDefault();
    if (input.control && input.alt && input.key.toLowerCase() === 's') { event.preventDefault(); openSetup(); }
    if (input.control && input.alt && input.key.toLowerCase() === 'q') { event.preventDefault(); app.quit(); }
  });
  return window;
}

function openSetup() {
  if (setupWindow && !setupWindow.isDestroyed()) { setupWindow.show(); setupWindow.focus(); return; }
  setupWindow = secureWindow({ width: 1120, height: 780, title: 'KMUCS Signage 설정' });
  setupWindow.on('close', (event) => {
    if (!quitting && players.size) { event.preventDefault(); setupWindow.hide(); }
  });
  setupWindow.once('ready-to-show', () => { setupWindow.show(); setupWindow.focus(); });
  setupWindow.loadURL('signage://app/index.html').catch(report);
}

function assignmentRows() {
  if (demo && latest) return [
    { displayId: -1, sessionId: latest.sessions[0].id, role: 'list' },
    { displayId: -2, sessionId: latest.sessions[0].id, role: 'detail' },
    ...(latest.sessions[0].detailCount === 2 ? [{ displayId: -3, sessionId: latest.sessions[0].id, role: 'detail-secondary' }] : []),
  ];
  return settings.assignments;
}

function showPreparedPairs() {
  for (const record of players.values()) {
    const pair = [...players.values()].filter((r) => r.assignment.sessionId === record.assignment.sessionId);
    if (pair.every((r) => r.ready)) for (const r of pair) if (!r.window.isVisible()) r.window.showInactive();
  }
}

function reconcileWindows() {
  changingWindows = true;
  const displays = displayList();
  const desired = assignmentRows().filter((row) => timelines[row.sessionId] && (demo || displays.some((d) => d.id === row.displayId)));
  for (const [id, record] of players) {
    if (!desired.some((a) => a.displayId === id && a.sessionId === record.assignment.sessionId && a.role === record.assignment.role)) {
      players.delete(id); record.window.destroy();
    }
  }
  for (const assignment of desired) {
    const display = demo ? screen.getPrimaryDisplay() : displays.find((d) => d.id === assignment.displayId);
    const demoWidth = latest?.sessions[0].detailCount === 2 ? 280 : 420;
    const slot = assignment.role === 'list' ? 0 : assignment.role === 'detail' ? 1 : 2;
    const bounds = demo ? { x: display.bounds.x + 20 + slot * (demoWidth + 20), y: display.bounds.y + 50, width: demoWidth, height: Math.round(demoWidth * 16 / 9) } : display.bounds;
    const existing = players.get(assignment.displayId);
    if (existing) { if (!demo) existing.window.setBounds(bounds); continue; }
    const window = secureWindow({ ...bounds, frame: demo, fullscreen: !demo, kiosk: !demo, resizable: demo, title: `KMUCS ${assignment.sessionId} ${assignment.role}` });
    const record = { assignment, window, ready: false, failures: 0 };
    players.set(assignment.displayId, record);
    window.on('close', (event) => { if (!quitting) event.preventDefault(); });
    window.webContents.on('render-process-gone', () => {
      record.ready = false;
      candidate?.ready.delete(window.webContents.id);
      if (++record.failures <= 3) setTimeout(() => { if (!window.isDestroyed()) window.reload(); }, 2000);
      else { report(new Error('재생 창이 반복해서 종료됐습니다. 앱을 재시작하세요.')); openSetup(); }
    });
    window.loadURL('signage://app/index.html?player=1').catch(report);
  }
  if (players.size && blocker === undefined) blocker = powerSaveBlocker.start('prevent-display-sleep');
  if (!players.size && blocker !== undefined) { powerSaveBlocker.stop(blocker); blocker = undefined; }
  showPreparedPairs();
  changingWindows = false;
  broadcast();
}

async function commitCandidate() {
  if (!candidate || candidate.committing) return;
  if ([...players.values()].some((r) => !candidate.ready.has(r.window.webContents.id))) return;
  candidate.committing = true;
  const manifest = candidate.manifest;
  const before = timelines;
  const previousLatest = latest;
  timelines = Object.keys(timelines).length ? scheduleManifest(timelines, manifest, now(), assignmentRows().map((a) => a.sessionId)) : initialTimelines(manifest);
  latest = manifest;
  try {
    await persist();
    candidate = null;
    lastError = '';
    reconcileWindows();
  } catch (e) {
    timelines = before; latest = previousLatest; candidate = null; throw e;
  }
}

async function refresh() {
  if (fetching || pruning || candidate || Object.values(timelines).some((t) => t.pending && now() < t.pending.activateAt)) return;
  fetching = true; broadcast();
  try {
    const manifest = await fetchManifest(source);
    lastChecked = new Date().toISOString();
    if (manifest.revision !== latest?.revision) {
      await cacheAssets(manifest, source, cacheDirectory);
      candidate = { manifest, ready: new Set(), startedAt: now(), committing: false };
      broadcast();
      await commitCandidate();
    }
    lastError = '';
  } catch (error) { report(error); }
  finally { fetching = false; cacheDirty = true; broadcast(); }
}

function trusted(event, admin = false) {
  const url = new URL(event.senderFrame.url);
  if (event.senderFrame !== event.sender.mainFrame || url.protocol !== 'signage:' || url.hostname !== 'app') throw new Error('허용되지 않은 호출');
  const record = [...players.values()].find((r) => r.window.webContents === event.sender);
  if (admin && event.sender !== setupWindow?.webContents) throw new Error('설정 창에서만 사용할 수 있습니다.');
  if (!record && event.sender !== setupWindow?.webContents) throw new Error('알 수 없는 창');
  return record;
}

async function start() {
  Menu.setApplicationMenu(null);
  if (development && process.env.SIGNAGE_USER_DATA_DIR) {
    await mkdir(process.env.SIGNAGE_USER_DATA_DIR, { recursive: true });
    app.setPath('userData', process.env.SIGNAGE_USER_DATA_DIR);
  }
  if (process.platform === 'win32') app.setAppUserModelId('kr.ac.kookmin.cs.signage');
  dataDirectory = app.getPath('userData');
  cacheDirectory = join(dataDirectory, 'assets');
  await mkdir(cacheDirectory, { recursive: true });
  protocol.handle('signage', async (request) => {
    try {
      const url = new URL(request.url);
      let file;
      if (url.hostname === 'app' && /^\/cache\/[a-f0-9]{64}\.(png|jpg|jpeg|webp|svg|ttf|woff|woff2)$/.test(url.pathname)) file = join(cacheDirectory, url.pathname.slice(7));
      else if (url.hostname === 'app') {
        const root = resolve(directory, '../dist');
        file = resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });
      } else return new Response('Not found', { status: 404 });
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' }[extname(file)];
      if (!mime) return new Response('Forbidden', { status: 403 });
      return new Response(await readFile(file), { headers: {
        'Content-Type': mime, 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      } });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  try {
    const saved = await readJson(join(dataDirectory, 'settings.json'), settings);
    if (!Array.isArray(saved.assignments) || typeof saved.autoStart !== 'boolean') throw new Error('저장된 모니터 설정 형식 오류');
    // Disconnected displays remain assigned so they can recover when plugged back in.
    validateAssignments(saved.assignments, saved.assignments.map((a) => ({ id: a.displayId })), [...new Set(saved.assignments.map((a) => a.sessionId))]);
    settings = saved;
  } catch (e) { report(e); }
  try {
    const saved = await readJson(join(dataDirectory, 'playback.json'), null);
    if (saved) {
      validateTimelines(saved.timelines);
      validateManifest(saved.latest);
      const manifests = [saved.latest, ...Object.values(saved.timelines).flatMap((t) => [t.current.manifest, t.pending?.playback.manifest].filter(Boolean))];
      const assets = new Map(manifests.flatMap((m) => m.assets.map((a) => [assetName(a), a])));
      for (const [name, asset] of assets) if (digest(await readFile(join(cacheDirectory, name))) !== asset.sha256) throw new Error('저장된 이미지 또는 폰트 손상. 네트워크에서 다시 받습니다.');
      timelines = saved.timelines; latest = saved.latest;
    }
  } catch (e) { report(e); }

  ipcMain.handle('snapshot', (event) => snapshot(trusted(event)));
  ipcMain.handle('clock', (event) => { trusted(event); return now(); });
  ipcMain.handle('refresh', async (event) => { trusted(event, true); await refresh(); });
  ipcMain.handle('quit', (event) => { trusted(event, true); app.quit(); });
  ipcMain.handle('save-setup', async (event, value) => {
    trusted(event, true);
    if (!value || typeof value.autoStart !== 'boolean') throw new Error('자동 실행 설정 오류');
    const assignments = validateAssignments(value.assignments, displayList(), Object.keys(timelines), Object.fromEntries(Object.entries(timelines).map(([id, timeline]) => [id, getSession(playbackAt(timeline, now())).detailCount ?? 1])));
    const next = { assignments, autoStart: value.autoStart };
    await atomicJson(join(dataDirectory, 'settings.json'), next);
    settings = next;
    if (process.platform === 'win32' && app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.autoStart, path: process.execPath });
    reconcileWindows();
    await commitCandidate();
    return snapshot();
  });
  ipcMain.handle('prepared', async (event, { revision, error }) => {
    const record = trusted(event);
    if (!record || typeof revision !== 'string') return;
    if (error) {
      if (candidate?.manifest.revision === revision) candidate = null;
      report(new Error(`화면 준비 실패: ${String(error).slice(0, 300)}`));
      openSetup(); return;
    }
    if (revision === candidate?.manifest.revision) {
      candidate.ready.add(event.sender.id);
      await commitCandidate();
    }
    const current = timelines[record.assignment.sessionId];
    if (current && revision === playbackAt(current, now()).manifest.revision) record.ready = true;
    showPreparedPairs();
  });
  globalShortcut.register('Control+Alt+S', openSetup);
  globalShortcut.register('Control+Alt+Q', () => app.quit());
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, () => {
    reconcileWindows(); commitCandidate().catch(report);
    if (settings.assignments.some((a) => !screen.getAllDisplays().some((d) => d.id === a.displayId))) openSetup();
  });
  powerMonitor.on('resume', () => {
    clockEpoch = Date.now(); clockOrigin = performance.now();
    broadcast(); refresh().catch(report);
  });
  reconcileWindows();
  if (!players.size || lastError) openSetup();
  refresh().catch(report);
  let lastPoll = now();
  let maintaining = false;
  setInterval(async () => {
    if (maintaining) return;
    maintaining = true;
    try {
      if (candidate && !candidate.committing && now() - candidate.startedAt > 45000) { candidate = null; report(new Error('모든 화면의 준비 확인을 받지 못해 기존 재생을 유지합니다.')); }
      let changed = false;
      const keep = new Set([...(latest?.sessions.map((s) => s.id) ?? []), ...assignmentRows().map((a) => a.sessionId)]);
      for (const id of Object.keys(timelines)) if (!keep.has(id)) { delete timelines[id]; changed = true; }
      for (const timeline of Object.values(timelines)) if (timeline.pending && now() >= timeline.pending.activateAt) {
        timeline.current = timeline.pending.playback; delete timeline.pending; changed = true;
      }
      if (changed) { await persist(); broadcast(); cacheDirty = true; }
      if (cacheDirty && !fetching && !candidate) {
        pruning = true;
        try {
          const manifests = Object.values(timelines).flatMap((t) => [t.current.manifest, t.pending?.playback.manifest].filter(Boolean));
          if (latest) manifests.push(latest);
          await pruneAssets(cacheDirectory, manifests);
          cacheDirty = false;
        } finally { pruning = false; }
      }
      if (now() - lastPoll >= (latest?.pollIntervalSeconds ?? 60) * 1000) { lastPoll = now(); await refresh(); }
    } catch (e) { report(e); }
    finally { maintaining = false; }
  }, 1000);
}

app.on('before-quit', () => { quitting = true; globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { if (!quitting && !changingWindows) app.quit(); });
app.on('activate', () => { if (!quitting) openSetup(); });
