import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source=readFileSync(new URL('./analytics-events.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function setup() {
  const events=[],handlers={},observers=[];
  let marker={};
  class Element { closest(selector) { return selector==='a' ? this.link : this.newsletter ? {} : null; } }
  class Observer {
    constructor(callback) { this.callback=callback;observers.push(this); }
    observe(target) { this.target=target; }
    disconnect() { this.disconnected=true; }
    fire() { this.callback([{target:this.target,isIntersecting:true}]); }
  }
  const window={location:{origin:'https://example.org',pathname:'/articles/example/'},gtag:(...args)=>events.push(args),IntersectionObserver:Observer};
  const document={addEventListener:(name,fn)=>{handlers[name]=fn;},querySelector:()=>marker};
  const c=vm.createContext({exports:{},window,document,Element,IntersectionObserver:Observer,WeakSet,URL});
  vm.runInContext(js,c);c.exports.initAnalyticsEvents();
  return {events,handlers,observers,window,Element,setMarker(value){marker=value;}};
}
test('content selection and contact clicks never send full URLs or addresses',()=>{
  const s=setup();const target=new s.Element();
  target.link={protocol:'https:',origin:'https://example.org',pathname:'/articles/example/',dataset:{analyticsContent:'hero'},closest:()=>null};
  s.handlers.click({target});assert.equal(s.events[0][1],'select_content');
  assert.equal(s.events[0][2].content_type,'article');assert.equal(s.events[0][2].content_id,'example');assert.equal(s.events[0][2].selection_location,'hero');
  target.link={protocol:'mailto:',pathname:'private@example.org'};s.handlers.click({target});
  assert.equal(s.events[1][1],'contact_click');assert.equal(JSON.stringify(s.events).includes('private@example.org'),false);
  target.link={protocol:'https:',origin:'https://external.example',pathname:'/articles/example/',dataset:{analyticsContent:'card'}};s.handlers.click({target});assert.equal(s.events.length,2);
});
test('end event fires once per page and stale observers cannot affect the next page',()=>{
  const s=setup();s.handlers['astro:page-load']();assert.equal(s.observers.length,1);
  s.observers[0].fire();s.observers[0].fire();assert.equal(s.events.length,1);assert.equal(s.events[0][1],'article_end_reached');
  s.window.location.pathname='/news/newsletter-003/';s.setMarker({});s.handlers['astro:page-load']();
  s.observers[0].fire();assert.equal(s.events.length,1);s.observers[1].fire();assert.equal(s.events[1][1],'newsletter_end_reached');
});
test('newsletter links have their own selection location and filters do not count',()=>{
  const s=setup();const target=new s.Element();
  target.link={protocol:'https:',origin:'https://example.org',pathname:'/articles/example/',dataset:{},closest:()=>({})};s.handlers.click({target});
  assert.equal(s.events[0][2].selection_location,'newsletter');
  target.link={protocol:'https:',origin:'https://example.org',pathname:'/articles/tags/AI/',dataset:{analyticsContent:'card'},closest:()=>null};s.handlers.click({target});assert.equal(s.events.length,1);
});
