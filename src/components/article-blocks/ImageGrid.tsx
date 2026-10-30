import imageMetadata from '@/content/config/image-meta.json';
import { imageGrid, imageGridItem, imageGridImg, imageCaption } from './ImageGrid.css';

interface ImageItem {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageGridProps {
  images: ImageItem[];
  columns?: 1 | 2 | 3;
}

export function ImageGrid({ images, columns = 2 }: ImageGridProps) {
  return (
    <div className={imageGrid({ columns })}>
      {images.map((img, i) => {
        const size = imageMetadata[img.src as keyof typeof imageMetadata];
        return (
        <figure key={i} className={imageGridItem}>
          <img src={img.src} alt={img.alt} className={imageGridImg} width={size?.width} height={size?.height} loading="lazy" decoding="async" />
          {img.caption && <figcaption className={imageCaption}>{img.caption}</figcaption>}
        </figure>
        );
      })}
    </div>
  );
}
