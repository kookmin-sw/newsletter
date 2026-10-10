import { parseFragment } from 'parse5';

/** @param {import('parse5').DefaultTreeAdapterMap['node']} node */
function children(node) { return 'childNodes' in node ? node.childNodes : []; }

/** @param {import('parse5').DefaultTreeAdapterMap['node']} node */
function text(node) {
  if (node.nodeName === '#text') return /** @type {import('parse5').DefaultTreeAdapterMap['textNode']} */ (node).value;
  if (['script', 'style', 'template'].includes(node.nodeName)) return '';
  if (node.nodeName === 'br') return '\n';
  return children(node).map(text).join('');
}

/**
 * Read the existing newsletter cards, keeping their wording and paragraph breaks.
 * @param {string} html
 * @param {string} siteUrl
 * @returns {Record<string, string[]>}
 */
export function newsletterSummaries(html, siteUrl) {
  const summaries = Object.create(null);
  const origin = new URL(siteUrl).origin;
  /** @param {import('parse5').DefaultTreeAdapterMap['node']} node */
  function visit(node) {
    if (node.nodeName === 'a' && 'attrs' in node) {
      const href = node.attrs.find(a => a.name === 'href')?.value;
      let url;
      try { url = new URL(href ?? '', siteUrl); } catch { return; }
      const match = url.origin === origin && url.pathname.match(/^\/articles\/([a-z0-9][a-z0-9-]*)\/?$/);
      if (match) {
        /** @type {string[]} */
        const paragraphs = [];
        /** @param {import('parse5').DefaultTreeAdapterMap['node']} child */
        function collect(child) {
          if (child.nodeName === 'p') {
            paragraphs.push(...text(child).split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean));
          } else children(child).forEach(collect);
        }
        collect(node);
        if (paragraphs.length) {
          if (summaries[match[1]]) throw new Error(`뉴스레터 요약 중복: ${match[1]}`);
          summaries[match[1]] = paragraphs;
        }
      }
    }
    children(node).forEach(visit);
  }
  visit(parseFragment(html));
  return summaries;
}
