import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import * as styles from './Hero.css';

interface HeroStat {
  value: string;
  label: string;
}

export interface CarouselSlide {
  image?: string;
  gradient?: string;
  alt?: string;
  title?: string;
  href?: string;
}

interface HeroProps {
  label?: string;
  title: string;
  subtitle?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  stats?: HeroStat[];
  slides?: CarouselSlide[];
  interval?: number;
}

export function Hero({ label, title, subtitle, primaryAction, secondaryAction, stats, slides = [], interval = 6500 }: HeroProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hasSlides = slides.length > 0;
  const slide = slides[current];

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || interacting || reducedMotion) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % slides.length), interval);
    return () => window.clearInterval(timer);
  }, [slides.length, interval, paused, interacting, reducedMotion]);

  function selectSlide(index: number) {
    setCurrent((index + slides.length) % slides.length);
    setPaused(true);
  }

  return (
    <section className={styles.hero} aria-label="동문 커뮤니티 소개">
      {hasSlides ? (
        <div className={styles.carouselContainer} aria-hidden="true">
          {slides.map((item, index) => (
            <div key={item.image ?? index} className={styles.carouselSlide}
              style={{ opacity: index === current ? 1 : 0, background: item.gradient }}>
              {item.image && <img src={item.image} alt="" className={styles.carouselImage}
                loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />}
            </div>
          ))}
          <div className={styles.carouselOverlay} />
        </div>
      ) : <div className={styles.heroBackground} aria-hidden="true" />}

      <div className={styles.heroContent}>
        {label && <span className={styles.heroLabel}>{label}</span>}
        <h1 className={styles.heroTitle}>{title}</h1>
        {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
        <div className={styles.heroActions}>
          {primaryAction && <Button as="a" href={primaryAction.href} size="lg">{primaryAction.label}</Button>}
          {secondaryAction && <Button as="a" href={secondaryAction.href} variant="ghost-light" size="lg">{secondaryAction.label}</Button>}
        </div>
        {stats && stats.length > 0 && (
          <div className={styles.heroStat}>
            {stats.map((stat) => <div key={stat.label} className={styles.heroStatItem}>
              <span className={styles.heroStatValue}>{stat.value}</span>
              <span className={styles.heroStatLabel}>{stat.label}</span>
            </div>)}
          </div>
        )}
        {hasSlides && (
          <div className={styles.carouselFooter}
            onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
            onFocus={() => setInteracting(true)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
            {slide.title && (slide.href
              ? <a className={styles.carouselCaption} href={slide.href}>{slide.title}<span aria-hidden="true">↗</span></a>
              : <span className={styles.carouselCaption}>{slide.title}</span>)}
            {slides.length > 1 && <div className={styles.carouselControls}>
              <button type="button" className={styles.carouselControl} onClick={() => selectSlide(current - 1)} aria-label="이전 사진">←</button>
              <span className={styles.carouselCount}>{String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
              <button type="button" className={styles.carouselControl} onClick={() => selectSlide(current + 1)} aria-label="다음 사진">→</button>
              {!reducedMotion && <button type="button" className={styles.carouselControl} onClick={() => setPaused(!paused)}
                aria-label={paused ? '사진 자동 재생' : '사진 자동 재생 일시정지'}>{paused ? '▶' : 'Ⅱ'}</button>}
            </div>}
          </div>
        )}
      </div>
    </section>
  );
}
