import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import {
  sectionHeaderWrapper,
  sectionLabel,
  sectionDescription,
  sectionDivider,
  sectionHeaderCenter,
} from './SectionHeader.css';

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  level?: 1 | 2 | 3;
  showDivider?: boolean;
  className?: string;
}

export function SectionHeader({
  label,
  title,
  description,
  align = 'left',
  level = 2,
  showDivider = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={`${sectionHeaderWrapper}${align === 'center' ? ` ${sectionHeaderCenter}` : ''}${className ? ` ${className}` : ''}`}
    >
      {label && <span className={sectionLabel}>{label}</span>}
      <Heading level={level} align={align}>
        {title}
      </Heading>
      {description && (
        <Text size="lg" color="secondary" className={sectionDescription}>
          {description}
        </Text>
      )}
      {showDivider && <hr className={sectionDivider} />}
    </div>
  );
}
