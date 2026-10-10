export function createAppUpdates(updater, notify) {
  let state = { status: 'idle', version: null, percent: 0, error: '' };
  let busy = false;
  const set = (patch) => { state = { ...state, ...patch }; notify(); };
  const failed = (error) => set({ status: 'error', error: String(error?.message ?? error).slice(0, 500) });

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.autoRunAppAfterInstall = true;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.on('error', failed);
  updater.on('checking-for-update', () => set({ status: 'checking', error: '', percent: 0 }));
  updater.on('update-available', (info) => set({ status: 'available', version: info.version, error: '' }));
  updater.on('update-not-available', () => set({ status: 'current', version: null, error: '' }));
  updater.on('download-progress', ({ percent }) => {
    const next = Math.max(0, Math.min(100, Math.floor(percent)));
    if (Number.isFinite(next) && next !== state.percent) set({ percent: next });
  });
  updater.on('update-downloaded', (info) => set({ status: 'ready', version: info.version, percent: 100, error: '' }));

  return {
    get state() { return state; },
    async check() {
      if (busy || state.status === 'ready' || state.status === 'installing') return;
      busy = true;
      try { await updater.checkForUpdates(); }
      catch (error) { failed(error); }
      finally { busy = false; }
    },
    async download() {
      if (busy || state.status !== 'available') throw new Error('먼저 새 버전을 확인하세요.');
      busy = true;
      set({ status: 'downloading', percent: 0, error: '' });
      try { await updater.downloadUpdate(); }
      catch (error) { failed(error); }
      finally { busy = false; }
    },
    install() {
      if (busy || state.status !== 'ready') throw new Error('업데이트 다운로드와 검증이 완료되지 않았습니다.');
      set({ status: 'installing', error: '' });
      try { updater.quitAndInstall(false, true); }
      catch (error) { failed(error); }
    },
  };
}
