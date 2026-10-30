export function trackImage(image: HTMLImageElement) {
  if (image.dataset.imageState) return;
  if (image.complete) {
    image.dataset.imageState = image.naturalWidth > 0 ? 'loaded' : 'error';
    if (!image.naturalWidth) image.classList.add('image-error');
    return;
  }
  image.dataset.imageState = 'pending';
  image.classList.add('image-pending');
  const finish = (event: Event) => {
    const loaded = event.type === 'load' && image.naturalWidth > 0;
    image.dataset.imageState = loaded ? 'loaded' : 'error';
    image.classList.remove('image-pending');
    image.classList.add(loaded ? 'image-enter' : 'image-error');
    image.removeEventListener('load', finish);
    image.removeEventListener('error', finish);
  };
  image.addEventListener('load', finish);
  image.addEventListener('error', finish);
}

export function initImageLoading() {
  document.querySelectorAll<HTMLImageElement>('main img').forEach(trackImage);
}
