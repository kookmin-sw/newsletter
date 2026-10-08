import { asset } from '@/lib/path';
import { grid, card, logoArea, logoImage, companyName, visitLabel } from './CompanyGrid.css';

interface CompanyGridProps {
  companies: { name: string; href: string; logo?: string }[];
}

export function CompanyGrid({ companies }: CompanyGridProps) {
  return (
    <ul className={grid}>
      {companies.map(({ name, href, logo }) => (
        <li key={name} style={{ margin: 0 }}>
          <a className={card} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} 홈페이지 (새 창)`}>
            <div className={logoArea}>
              {logo && <img className={logoImage} src={asset(logo)} alt="" loading="lazy" style={{ margin: 0, borderRadius: 0 }} />}
            </div>
            <span className={companyName}>{name}</span>
            <span className={visitLabel}>홈페이지 <span aria-hidden="true">↗</span></span>
          </a>
        </li>
      ))}
    </ul>
  );
}
