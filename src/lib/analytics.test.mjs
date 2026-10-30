import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../components/analytics/GoogleAnalytics.astro',import.meta.url),'utf8');
const script=source.match(/<script is:inline[^>]*>([\s\S]*?)<\/script>/)[1];
function context(hostname) {
  const scripts=[];
  const context=vm.createContext({measurementId:'G-TDQE5D0R67',productionHost:'alumni.cs.kookmin.ac.kr',location:{hostname},window:{},document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}}});
  return {context,scripts};
}
test('loads one Google tag despite repeated Astro navigation scripts',()=>{
  const {context:c,scripts}=context('alumni.cs.kookmin.ac.kr');
  vm.runInContext(script,c);vm.runInContext(script,c);
  assert.equal(scripts.length,1);assert(scripts[0].async);
  assert.equal(c.window.dataLayer.length,2);
  assert.equal(c.window.dataLayer[0][0],'js');
  assert.equal(c.window.dataLayer[1][0],'config');
  assert.equal(c.window.dataLayer[1][1],'G-TDQE5D0R67');
  assert.equal(scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-TDQE5D0R67');
  assert(!script.includes("'page_view'"),'Manual pageviews would duplicate enhanced history measurement');
});
test('localhost and other hosts send no analytics',()=>{
  for(const hostname of ['localhost','127.0.0.1','kookmin-sw.github.io']) {
    const {context:c,scripts}=context(hostname);vm.runInContext(script,c);
    assert.equal(scripts.length,0);assert.equal(c.window.dataLayer,undefined);
  }
});
