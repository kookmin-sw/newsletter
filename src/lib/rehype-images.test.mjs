import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rehypeImages } from './rehype-images.mjs';
const metadata=JSON.parse(readFileSync(new URL('../content/config/image-meta.json',import.meta.url),'utf8'));
const [src,size]=Object.entries(metadata)[0];
test('Markdown images reserve space and use lazy decoding defaults',()=>{
  const image={type:'element',tagName:'img',properties:{src},children:[]};
  rehypeImages()({children:[image]});
  assert.equal(image.properties.width,size.width);assert.equal(image.properties.height,size.height);
  assert.equal(image.properties.loading,'lazy');
});
test('MDX images preserve explicit priority and dimensions',()=>{
  const image={type:'mdxJsxFlowElement',name:'img',attributes:[{type:'mdxJsxAttribute',name:'src',value:src},{type:'mdxJsxAttribute',name:'loading',value:'eager'},{type:'mdxJsxAttribute',name:'width',value:'600'}]};
  rehypeImages()({children:[image]});
  const value=name=>image.attributes.find(a=>a.name===name)?.value;
  assert.equal(value('loading'),'eager');assert.equal(value('width'),'600');assert.equal(value('height'),undefined);
});
