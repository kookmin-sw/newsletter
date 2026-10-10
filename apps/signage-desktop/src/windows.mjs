export function showPreparedPairs(records, setupWindow, windowsDisplays) {
  let shown = false;
  for (const record of records) {
    if (record.window.isDestroyed() || record.window.isVisible()) continue;
    const pair = records.filter((r) => r.assignment.sessionId === record.assignment.sessionId);
    if (!pair.every((r) => r.ready && !r.window.isDestroyed())) continue;
    const window = record.window;
    if (windowsDisplays) {
      const display = windowsDisplays.find((d) => d.id === record.assignment.displayId);
      if (!display) continue;
      // Apply the same display bounds as save-setup, after Windows shows the HWND.
      window.show();
      window.setBounds(display.bounds);
      if (!window.isKiosk()) window.setKiosk(true);
      window.setAlwaysOnTop(true, 'pop-up-menu');
      window.moveTop();
    } else window.showInactive();
    shown = true;
  }
  if (shown && setupWindow && !setupWindow.isDestroyed() && setupWindow.isVisible()) {
    setupWindow.moveTop();
    if (windowsDisplays) setupWindow.focus();
  }
}
