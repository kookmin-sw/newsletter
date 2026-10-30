export function signageUrl(url, newsletterId) {
  const tagged = new URL(url);
  tagged.searchParams.set('utm_source', 'campus_display');
  tagged.searchParams.set('utm_medium', 'qr');
  if (newsletterId) tagged.searchParams.set('utm_campaign', newsletterId);
  return tagged.href;
}
