import { tag, tagList } from './Tag.css';
import { url } from '@/lib/path';
import { pagePath } from '@/lib/seo.mjs';

interface TagProps {
  label: string;
  href?: string;
  className?: string;
}

export function Tag({ label, href, className }: TagProps) {
  const classes = `${tag}${className ? ` ${className}` : ''}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        #{label}
      </a>
    );
  }

  return <span className={classes}>#{label}</span>;
}

interface TagListProps {
  tags: string[];
  basePath?: string;
  className?: string;
}

export function TagList({ tags, basePath, className }: TagListProps) {
  const resolvedBase = basePath ?? url('/articles/tags');
  return (
    <div className={`${tagList}${className ? ` ${className}` : ''}`}>
      {tags.map((t) => (
        <Tag key={t} label={t} href={pagePath(`${resolvedBase.replace(/\/$/, '')}/${encodeURIComponent(t)}`)} />
      ))}
    </div>
  );
}
