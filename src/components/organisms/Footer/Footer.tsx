import { asset } from '@/lib/path';
import {
  footer,
  footerInner,
  footerGrid,
  footerLogoSection,
  footerLogo,
  footerTitle,
  footerDescription,
  footerColTitle,
  footerLinkGroup,
  footerLink,
  footerText,
  footerBottom,
} from './Footer.css';

interface FooterLink {
  label: string;
  url: string;
}

interface FooterProps {
  externalLinks?: FooterLink[];
}

export function Footer({ externalLinks = [] }: FooterProps) {
  return (
    <footer className={footer}>
      <div className={footerInner}>
        <div className={footerGrid}>
          <div>
            <div className={footerLogoSection}>
              <img src={asset('/images/logo.svg')} alt="KMU-CS Alumni" className={footerLogo} />
              <div className={footerTitle}>KMU-CS Alumni</div>
            </div>
            <p className={footerDescription}>
              국민대학교 소프트웨어융합대학 졸업 동문들의 네트워크.
              함께 성장하고, 다시 만나며, 미래를 그립니다.
            </p>
          </div>

          <div>
            <div className={footerColTitle}>관련 사이트</div>
            <div className={footerLinkGroup}>
              {externalLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  className={footerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className={footerColTitle}>문의</div>
            <div className={footerLinkGroup}>
              <a href="mailto:alumni@cs.kookmin.ac.kr" className={footerLink}>
                alumni@cs.kookmin.ac.kr
              </a>
              <span className={footerText}>국민대학교 소프트웨어융합대학</span>
            </div>
          </div>
        </div>

        <div className={footerBottom}>
          &copy; {new Date().getFullYear()} KMU-CS Alumni
        </div>
      </div>
    </footer>
  );
}
