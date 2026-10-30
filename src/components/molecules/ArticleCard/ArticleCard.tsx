import { Badge } from '@/components/atoms/Badge';
import { asset } from '@/lib/path';
import {
  card,
  cardImage,
  cardImagePlaceholder,
  cardBody,
  cardMeta,
  cardTitle,
  cardExcerpt,
  cardLink,
  cardTags,
} from './ArticleCard.css';

interface ArticleCardProps {
  title: string;
  excerpt?: string;
  publishedAt: string;
  author: string;
  coverImage?: string;
  tags?: string[];
  category?: string;
  href: string;
  className?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const categoryLabels: Record<string, string> = {
  notice: '공지',
  interview: '인터뷰',
  event: '행사',
  story: '스토리',
  column: '칼럼',
  news: '뉴스',
};

export function ArticleCard({
  title,
  excerpt,
  publishedAt,
  author,
  coverImage,
  tags = [],
  category,
  href,
  className,
}: ArticleCardProps) {
  return (
    <article className={`${card}${className ? ` ${className}` : ''}`}>
      <a href={href} className={cardLink}>
        {coverImage ? (
          <img src={asset(coverImage)} alt={title} className={cardImage} width="640" height="400" loading="lazy" decoding="async" />
        ) : (
          <div className={cardImagePlaceholder} aria-hidden="true">
            KMU
          </div>
        )}
        <div className={cardBody}>
          <div className={cardMeta}>
            {category && (
              <Badge variant="primary" size="sm">
                {categoryLabels[category] ?? category}
              </Badge>
            )}
            <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{author}</span>
          </div>
          <h3 className={cardTitle}>{title}</h3>
          {excerpt && <p className={cardExcerpt}>{excerpt}</p>}
          {tags.length > 0 && (
            <div className={cardTags}>
              {tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="default" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </a>
    </article>
  );
}
