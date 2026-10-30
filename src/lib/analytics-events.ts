type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void };

export function initAnalyticsEvents() {
  const analytics = window as AnalyticsWindow;
  const seen = new WeakSet<Element>();
  let observed: Element | null = null;
  let observer: IntersectionObserver | undefined;

  function send(event: string, params?: Record<string, string>) {
    analytics.gtag?.('event', event, params ?? {});
  }

  function contentPath(pathname: string) {
    const match = /^\/(articles|news)\/([a-z0-9][a-z0-9-]*)\/?$/.exec(pathname);
    return match ? { content_type: match[1] === 'articles' ? 'article' : match[2].startsWith('newsletter-') ? 'newsletter' : 'news', content_id: match[2] } : null;
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a');
    if (!link) return;
    if (link.protocol === 'mailto:') {
      send('contact_click');
      return;
    }
    if (link.origin !== window.location.origin) return;
    const content = contentPath(link.pathname);
    if (!content) return;
    const position = link.dataset.analyticsContent || (link.closest('.html-newsletter') ? 'newsletter' : '');
    if (!['card', 'hero', 'newsletter'].includes(position)) return;
    send('select_content', { ...content, selection_location: position });
  });

  function observeEnd() {
    const marker = document.querySelector('[data-analytics-content-end]');
    if (marker === observed) return;
    observer?.disconnect();
    observed = marker;
    if (!marker || seen.has(marker) || !('IntersectionObserver' in window)) return;
    const content = contentPath(window.location.pathname);
    if (!content) return;
    observer = new IntersectionObserver((entries) => {
      if (marker !== observed || !entries.some(entry => entry.target === marker && entry.isIntersecting) || seen.has(marker)) return;
      seen.add(marker);
      send(`${content.content_type}_end_reached`, content);
      observer?.disconnect();
    });
    observer.observe(marker);
  }

  observeEnd();
  document.addEventListener('astro:page-load', observeEnd);
}
