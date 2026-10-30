import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { parseFragment } from 'parse5';
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const find = (node, name) => [...(node.nodeName === name ? [node] : []), ...(node.childNodes ?? []).flatMap(child => find(child, name))];
function validate(source) {
  const root = parseFragment(source.slice(source.indexOf('<table')),{sourceCodeLocationInfo:true});
  const cards = find(root, 'a').filter(n => /^\/articles\//.test(attr(n,'href') ?? ''));
  assert(cards.length > 0);
  const rows = cards.map(link => {
    let cell = link.parentNode;
    while (cell && !(cell.nodeName === 'td' && /background-color: #1a1a1a/.test(attr(cell, 'style') ?? ''))) cell = cell.parentNode;
    assert(cell?.sourceCodeLocation?.endTag, 'Unclosed newsletter card');
    assert.equal(find(cell,'a').length, 1, 'Nested article cards');
    assert.equal(find(cell,'h2').length, 1);
    assert.equal(find(cell,'img').length, 1);
    const image = find(cell,'img')[0];const src=attr(image,'src');
    assert(existsSync(`public${src}`), `Missing image: ${src}`);
    assert(statSync(`public${src}`).size < 1024 * 1024, `Oversized newsletter image: ${src}`);
    assert(['eager','lazy'].includes(attr(image,'loading')));
    return cell.parentNode.parentNode;
  });
  assert(rows.every(row => row === rows[0]), 'Cards must be siblings');
  const ids = [...(source.split('---')[1] ?? '').matchAll(/^  - ([a-z0-9-]+)$/gm)].map(m=>m[1]);
  if (ids.length) assert.deepEqual(cards.map(c=>attr(c,'href').split('/').filter(Boolean).at(-1)),ids);
  return cards.length;
}
const directory = new URL('../content/news/', import.meta.url);
for(const file of readdirSync(directory).filter(f=>/^newsletter-.*\.md$/.test(f))) {
  test(`${file}: card structure, metadata order, images`,()=>validate(readFileSync(new URL(file,directory),'utf8')));
}
test('rejects the missing closing tags that broke Vol.002',()=>{
  const source=readFileSync(new URL('newsletter-002.md',directory),'utf8');
  const broken=source.replace('              </table>\n            </div></a>\n          </td>\n        </tr>','');
  assert.notEqual(source,broken);assert.throws(()=>validate(broken));
});
