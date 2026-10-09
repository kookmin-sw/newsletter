import { Badge } from '@/components/atoms/Badge';
import {
  programCard,
  programCardLink,
  programBadgeRow,
  programTitle,
  programDescription,
  programSchedule,
} from './ProgramCard.css';

interface ProgramCardProps {
  title: string;
  description: string;
  schedule?: string;
  status: 'active' | 'upcoming' | 'past';
  href?: string;
  className?: string;
}

const statusLabels: Record<string, string> = {
  active: '진행 중',
  upcoming: '예정',
  past: '종료',
};

export function ProgramCard({
  title,
  description,
  schedule,
  status,
  href,
  className,
}: ProgramCardProps) {
  const content = (
    <>
      <div className={programBadgeRow}>
        <Badge variant={status === 'active' ? 'primary' : 'default'} size="sm">
          {statusLabels[status]}
        </Badge>
      </div>
      <h3 className={programTitle}>{title}</h3>
      <p className={programDescription}>{description}</p>
      {schedule && (
        <div className={programSchedule}>
          <span>{schedule}</span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={`${programCard} ${programCardLink}${className ? ` ${className}` : ''}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`${programCard}${className ? ` ${className}` : ''}`}>
      {content}
    </div>
  );
}
