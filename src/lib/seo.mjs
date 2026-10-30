export function isIndexablePath(pathname) {
  return !/^\/(?:tools|signage)(?:\/|$)/.test(pathname)
    && !/^\/(?:articles|news)\/tags(?:\/|$)/.test(pathname)
    && !/^\/404(?:\.html|\/)?$/.test(pathname);
}

export function pagePath(path) {
  const [, pathname, suffix = ''] = /^([^?#]*)([?#].*)?$/.exec(path);
  if (!pathname || /\.(?:html?|xml|json|txt|svg|png|jpe?g|webp|gif|ico|pdf)$/i.test(pathname)) return path;
  return `${pathname.replace(/\/+$/, '')}/${suffix}`;
}
