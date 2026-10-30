import { readFileSync } from 'node:fs';
const metadata = JSON.parse(readFileSync(new URL('../content/config/image-meta.json', import.meta.url), 'utf8'));

export function rehypeImages() {
  return (tree) => {
    function visit(node) {
      if (node.type === 'element' && node.tagName === 'img') {
        const size = metadata[node.properties.src];
        if (size && node.properties.width === undefined && node.properties.height === undefined) {
          node.properties.width ??= size.width;
          node.properties.height ??= size.height;
        }
        node.properties.loading ??= 'lazy';
        node.properties.decoding ??= 'async';
      }
      if (node.name === 'img' && Array.isArray(node.attributes)) {
        const value = (name) => node.attributes.find(attr => attr.name === name)?.value;
        const size = value('width') === undefined && value('height') === undefined ? metadata[value('src')] : undefined;
        for (const [name, attrValue] of Object.entries({ ...size, loading: 'lazy', decoding: 'async' })) {
          if (value(name) === undefined) node.attributes.push({ type: 'mdxJsxAttribute', name, value: String(attrValue) });
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
