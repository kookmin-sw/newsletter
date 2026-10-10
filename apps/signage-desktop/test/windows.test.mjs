import test from 'node:test';
import assert from 'node:assert/strict';
import { showPreparedPairs } from '../src/windows.mjs';

function fixture(displayId, sessionId = 'lobby') {
  const state = { visible: false, destroyed: false, active: false, bounds: null, kiosk: false, top: false, raises: 0, focusCount: 0 };
  const window = {
    isDestroyed: () => state.destroyed,
    isVisible: () => state.visible,
    isKiosk: () => state.kiosk,
    show: () => { state.visible = true; state.active = true; state.bounds = 'work-area'; state.top = false; },
    showInactive: () => { state.visible = true; },
    setBounds: (bounds) => { assert.ok(state.visible, '창 표시 후 모니터 전체 영역을 다시 적용해야 한다.'); state.bounds = bounds; },
    setKiosk: (value) => { state.kiosk = value; },
    setAlwaysOnTop: (value, level) => { assert.ok(state.visible); state.top = value && level === 'pop-up-menu'; },
    moveTop: () => { state.raises++; },
    focus: () => { state.focusCount++; },
  };
  return { assignment: { displayId, sessionId }, window, ready: true, state };
}

const displays = [
  { id: 1, bounds: { x: -1080, y: 0, width: 1080, height: 1920 } },
  { id: 2, bounds: { x: 0, y: 0, width: 864, height: 1536 } },
];

test('저장된 배정으로 시작할 때 두 창 모두 표시 후 전체 모니터 영역과 맨 위 배치를 적용한다', () => {
  const records = [fixture(1), fixture(2)];
  showPreparedPairs(records, null, displays);
  for (const [index, { state }] of records.entries()) {
    assert.equal(state.visible, true);
    assert.equal(state.active, true);
    assert.deepEqual(state.bounds, displays[index].bounds);
    assert.equal(state.kiosk, true);
    assert.equal(state.top, true);
    assert.equal(state.raises, 1);
  }
  for (let i = 0; i < 1000; i++) showPreparedPairs(records, null, displays);
  for (const { state } of records) assert.equal(state.raises, 1, '이미 재생 중인 창의 순서와 포커스를 반복 변경하지 않는다.');
});

test('같은 세션이 모두 준비될 때까지 기다리고 설정 창의 접근을 유지한다', () => {
  const records = [fixture(1), fixture(2), fixture(3, 'other')];
  records[1].ready = false;
  records[2].ready = false;
  const setup = fixture(0);
  setup.state.visible = true;
  showPreparedPairs(records, setup.window, displays);
  assert.ok(records.every(r => !r.state.visible));
  records[1].ready = true;
  showPreparedPairs(records, setup.window, displays);
  assert.equal(records[0].state.visible, true);
  assert.equal(records[1].state.visible, true);
  assert.equal(records[2].state.visible, false);
  assert.equal(setup.state.raises, 1);
  assert.equal(setup.state.focusCount, 1);
});

test('끊어진 모니터와 종료된 창은 표시하지 않는다', () => {
  const disconnected = fixture(99);
  showPreparedPairs([disconnected], null, displays);
  assert.equal(disconnected.state.visible, false);
  const destroyed = fixture(1);
  destroyed.state.destroyed = true;
  showPreparedPairs([destroyed], null, displays);
  assert.equal(destroyed.state.visible, false);
});

test('이 PC에 배정된 한 화면만 준비되어도 다른 PC의 역할을 기다리지 않고 표시한다', () => {
  for (const role of ['list', 'detail', 'detail-secondary']) {
    const record = fixture(1);
    record.assignment.role = role;
    showPreparedPairs([record], null, displays);
    assert.equal(record.state.visible, true);
    assert.equal(record.state.kiosk, true);
    assert.deepEqual(record.state.bounds, displays[0].bounds);
  }
});

test('데모와 다른 운영체제는 기존 비활성 표시와 창 크기를 유지한다', () => {
  const record = fixture(1);
  showPreparedPairs([record], null, null);
  assert.equal(record.state.visible, true);
  assert.equal(record.state.active, false);
  assert.equal(record.state.bounds, null);
  assert.equal(record.state.kiosk, false);
  assert.equal(record.state.raises, 0);
});
