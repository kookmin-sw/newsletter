import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionAt, reveal, selectorAt } from '../dist/motion.js';

test('제목은 이전 글자가 사라진 뒤 나타나고 모든 단계는 시간에서 결정된다', () => {
  for (let ms = 0; ms <= 950; ms++) {
    const progress = ms / 950;
    const motion = transitionAt(progress);
    assert.deepEqual(motion, transitionAt(progress));
    assert.equal(motion.outgoing * motion.heading, 0);
    for (const value of Object.values(motion)) assert.ok(value >= 0 && value <= 1);
  }
  assert.equal(transitionAt(1).outgoing, 0);
  for (const [key, value] of Object.entries(transitionAt(1))) if (key !== 'outgoing') assert.equal(value, 1);
  for (let i = 0; i < 4; i++) assert.equal(reveal(1, 0.38 + i * 0.06, 0.82 + i * 0.06), 1);
});

test('선택 표시가 점진적으로 가속·감속하고 마지막 행에서 첫 행으로 역주행하지 않는다', () => {
  let previous = 2;
  for (let step = 0; step <= 100; step++) {
    const selector = selectorAt(2, 3, step / 100, false);
    assert.ok(selector.position >= previous && selector.position <= 3);
    previous = selector.position;
    const wrap = selectorAt(5, 0, step / 100, true);
    assert.ok(wrap.position === 5 || wrap.position === 0);
    assert.ok(wrap.opacity >= 0 && wrap.opacity <= 1);
  }
  assert.ok(transitionAt(0.01).focus < 0.0001);
  assert.ok(1 - transitionAt(0.99).focus < 0.0001);
  assert.equal(selectorAt(5, 0, 0.5, true).opacity, 0);
  assert.deepEqual(selectorAt(5, 0, 1, true), { position: 0, opacity: 1 });
});
