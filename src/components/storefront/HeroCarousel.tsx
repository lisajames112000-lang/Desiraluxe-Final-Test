import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@mantine/core';
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import type { HeroSlide } from '../../types/settings';
import { isScheduleActive, nextScheduleBoundary } from '../../utils/schedule';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface HeroCarouselProps {
  slides: HeroSlide[];
}

const SLIDE_DURATION_MS = 7000;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [now, setNow] = useState(() => new Date());
  const visible = useMemo(() => slides.filter((s) => s.isVisible && isScheduleActive(s, now)).sort((a, b) => a.order - b.order), [now, slides]);
  const [index, setIndex] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden);
  const touchStart = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const paused = manualPaused || interactionPaused || documentHidden;

  useEffect(() => {
    const updateVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  // Reset the progress bar whenever the active slide changes.
  useEffect(() => {progress.set(0);}, [index, progress]);

  // Drive autoplay from the progress value so pausing freezes the bar exactly where it is.
  useEffect(() => {
    if (paused || visible.length < 2 || reducedMotion) return;
    const remaining = Math.max(0.05, (1 - progress.get()) * (SLIDE_DURATION_MS / 1000));
    const controls = animate(progress, 1, {
      duration: remaining,
      ease: 'linear',
      onComplete: () => setIndex((i) => (i + 1) % visible.length)
    });
    return () => controls.stop();
  }, [index, paused, progress, reducedMotion, visible.length]);

  useEffect(() => {
    const boundary = nextScheduleBoundary(slides, now);
    if (!boundary) return;
    const timer = window.setTimeout(() => setNow(new Date()), Math.min(boundary - now.getTime() + 100, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [now, slides]);

  useEffect(() => {if (index >= visible.length) setIndex(0);}, [index, visible.length]);
  if (!visible.length) return null;

  const current = visible[Math.min(index, visible.length - 1)];
  const nextSlide = visible[(index + 1) % visible.length];
  const go = (next: number) => setIndex((next + visible.length) % visible.length);
  const isDark = current.theme !== 'light';
  const overlay = normalizeOverlay(current.overlayStrength, isDark);
  const words = current.headline.trim().split(/\s+/);
  const align = current.textAlign || 'left';
  const alignClasses = align === 'center' ? 'mx-auto items-center text-center' : align === 'right' ? 'ml-auto items-end text-right' : 'items-start text-left';
  const total = String(visible.length).padStart(2, '0');

  return (
    <section
      className={`relative isolate min-h-[580px] overflow-hidden rounded-[1.75rem] sm:min-h-[620px] lg:min-h-[700px] ${isDark ? 'bg-[#04100B]' : 'bg-sage'}`}
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(e) => {if (!e.currentTarget.contains(e.relatedTarget as Node)) setInteractionPaused(false);}}
      onTouchStart={(e) => {touchStart.current = e.touches[0]?.clientX ?? null;}}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(delta) > 50) go(index + (delta < 0 ? 1 : -1));
        touchStart.current = null;
      }}>
      
      {/* Image layer: cinematic crossfade with a slow Ken Burns push-in */}
      <AnimatePresence initial={false}>
        <motion.div
          key={current.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 1.1, ease: 'easeInOut' }}>
          
          <motion.div
            className="h-full w-full"
            initial={reducedMotion ? false : { scale: 1.14 }}
            animate={{ scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : (SLIDE_DURATION_MS + 1500) / 1000, ease: 'linear' }}>
            
            <picture>
              <source media="(max-width: 639px)" srcSet={current.mobileImage || current.image} />
              <ImageWithFallback
                src={current.image}
                alt=""
                width={1920}
                height={1080}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                className={`h-full w-full ${current.mediaFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                style={{ objectPosition: current.focalPoint || 'center' }}
                containerClassName="h-full w-full" />
              
            </picture>
          </motion.div>
          <div className="absolute inset-0" style={{ backgroundColor: isDark ? `rgba(3, 14, 10, ${overlay})` : `rgba(250, 251, 248, ${overlay})` }} />
          <div className={`absolute inset-y-0 left-0 w-full sm:w-[62%] ${isDark ? 'bg-[#03100B]/45 sm:bg-[#03100B]/35' : 'bg-[#FAFBF8]/60'}`} />
        </motion.div>
      </AnimatePresence>

      {/* Top meta row */}
      <div className="pointer-events-none absolute left-6 right-6 top-6 z-10 flex items-center justify-between sm:left-12 sm:right-12 sm:top-9 lg:left-20 lg:right-16">
        <span className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] backdrop-blur-md ${isDark ? 'border-white/20 bg-white/10 text-white/85' : 'border-emerald-deep/20 bg-white/70 text-emerald-deep'}`}>
          Desiraluxe · Imported Luxury
        </span>
        <span className={`flex items-baseline gap-1.5 font-serif ${isDark ? 'text-white' : 'text-emerald-forest'}`} aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.id}
              initial={reducedMotion ? false : { y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { y: -14, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="text-3xl font-semibold sm:text-4xl">
              
              {String(index + 1).padStart(2, '0')}
            </motion.span>
          </AnimatePresence>
          <span className={`text-sm ${isDark ? 'text-white/50' : 'text-ink/50'}`}>/ {total}</span>
        </span>
      </div>

      {/* Copy */}
      <div className="relative z-10 flex min-h-[580px] items-center px-6 pb-32 pt-24 sm:min-h-[620px] sm:px-12 lg:min-h-[700px] lg:px-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            className={`flex max-w-2xl flex-col ${alignClasses}`}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -18, transition: { duration: 0.35, ease: 'easeIn' } }}
            aria-live={paused ? 'polite' : 'off'}>
            
            <motion.div
              className="mb-6 flex items-center gap-3"
              initial={reducedMotion ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}>
              
              <motion.span
                className={`block h-px ${isDark ? 'bg-[#D9C69E]' : 'bg-emerald-muted'}`}
                initial={reducedMotion ? false : { width: 0 }}
                animate={{ width: 44 }}
                transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }} />
              
              <p className={`text-[11px] font-bold uppercase tracking-[0.32em] sm:text-xs ${isDark ? 'text-[#D9C69E]' : 'text-emerald-muted'}`}>{current.eyebrow}</p>
            </motion.div>

            <h1 className={`font-serif text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-[5.25rem] ${isDark ? 'text-white' : 'text-emerald-forest'}`}>
              {words.map((word, i) =>
              <span key={`${word}-${i}`} className="mr-[0.22em] inline-block overflow-hidden pb-[0.1em] align-bottom last:mr-0">
                  <motion.span
                  className={`inline-block ${i === words.length - 1 ? `italic ${isDark ? 'text-[#D9C69E]' : 'text-emerald-muted'}` : ''}`}
                  initial={reducedMotion ? false : { y: '110%', rotate: 3 }}
                  animate={{ y: '0%', rotate: 0 }}
                  transition={{ duration: 0.9, delay: 0.22 + i * 0.08, ease: EASE_OUT }}>
                  
                    {word}
                  </motion.span>
                </span>
              )}
            </h1>

            <motion.p
              className={`mt-6 max-w-lg text-base leading-7 sm:text-lg sm:leading-8 ${isDark ? 'text-white/80' : 'text-ink/80'}`}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 + words.length * 0.08, ease: EASE_OUT }}>
              
              {current.subheadline}
            </motion.p>

            <motion.div
              className={`mt-9 flex flex-wrap items-center gap-3 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.42 + words.length * 0.08, ease: EASE_OUT }}>
              
              <Button
                component={Link}
                to={current.ctaHref}
                color={isDark ? 'champagne' : 'emerald'}
                size="lg"
                radius="xl"
                rightSection={<ArrowRightIcon size={18} />}
                className="!shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
                
                {current.ctaLabel}
              </Button>
              <Link
                to="/shop"
                className={`group inline-flex h-[50px] items-center gap-2 rounded-full border px-6 text-sm font-semibold no-underline backdrop-blur-md transition-colors duration-200 ${isDark ? 'border-white/30 bg-white/5 text-white hover:bg-white/15' : 'border-emerald-deep/30 bg-white/60 text-emerald-deep hover:bg-white'}`}>
                
                View all products
                <ArrowRightIcon size={16} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Up next preview (desktop) */}
      {visible.length > 1 &&
      <button
        type="button"
        onClick={() => go(index + 1)}
        className={`group absolute bottom-28 right-16 z-10 hidden w-72 items-center gap-4 rounded-2xl border p-3 text-left backdrop-blur-xl transition-[transform,background-color] duration-300 hover:-translate-y-1 lg:flex ${isDark ? 'border-white/15 bg-white/10 hover:bg-white/15' : 'border-line bg-white/80 hover:bg-white'}`}
        aria-label={`Next slide: ${nextSlide.headline}`}>
        
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
            <ImageWithFallback src={nextSlide.image} alt="" width={128} height={128} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" containerClassName="h-full w-full" />
          </span>
          <span className="min-w-0">
            <span className={`block text-[10px] font-bold uppercase tracking-[0.24em] ${isDark ? 'text-[#D9C69E]' : 'text-emerald-muted'}`}>Up next</span>
            <span className={`mt-1 block truncate font-serif text-base font-semibold ${isDark ? 'text-white' : 'text-emerald-forest'}`}>{nextSlide.headline}</span>
            <span className={`block truncate text-xs ${isDark ? 'text-white/60' : 'text-ink/60'}`}>{nextSlide.eyebrow}</span>
          </span>
        </button>
      }

      {/* Progress + controls */}
      <div className="absolute bottom-6 left-6 right-6 z-10 flex items-end justify-between gap-6 sm:bottom-9 sm:left-12 sm:right-12 lg:left-20 lg:right-16">
        <div className="flex flex-1 gap-2 sm:max-w-xl sm:gap-3" role="tablist" aria-label="Choose slide">
          {visible.map((slide, i) =>
          <button
            key={slide.id}
            type="button"
            role="tab"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}: ${slide.headline}`}
            aria-selected={i === index}
            className="group flex-1 py-2 text-left">
            
              <span className={`mb-2 hidden truncate text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 sm:block ${i === index ? isDark ? 'text-white' : 'text-emerald-deep' : isDark ? 'text-white/45 group-hover:text-white/80' : 'text-ink/45 group-hover:text-ink/80'}`}>
                {String(i + 1).padStart(2, '0')} · {slide.eyebrow}
              </span>
              <span className={`relative block h-[3px] overflow-hidden rounded-full ${isDark ? 'bg-white/20' : 'bg-emerald-deep/15'}`}>
                {i < index && <span className={`absolute inset-0 ${isDark ? 'bg-white/70' : 'bg-emerald-deep/60'}`} />}
                {i === index &&
              <motion.span
                className={`absolute inset-0 origin-left ${isDark ? 'bg-[#D9C69E]' : 'bg-emerald-deep'}`}
                style={{ scaleX: reducedMotion || visible.length < 2 ? 1 : progress }} />

              }
              </span>
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ControlButton dark={isDark} label={manualPaused ? 'Resume carousel autoplay' : 'Pause carousel autoplay'} onClick={() => setManualPaused((x) => !x)}>
            {manualPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
          </ControlButton>
          <ControlButton dark={isDark} label="Previous slide" onClick={() => go(index - 1)}><ArrowLeftIcon size={17} /></ControlButton>
          <ControlButton dark={isDark} label="Next slide" onClick={() => go(index + 1)}><ArrowRightIcon size={17} /></ControlButton>
        </div>
      </div>
    </section>);

}

interface ControlButtonProps {
  dark: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ControlButton({ dark, label, onClick, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-[background-color,transform] duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${dark ? 'border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-[#D9C69E]' : 'border-emerald-deep/20 bg-white/80 text-emerald-deep hover:bg-white focus-visible:outline-emerald-deep'}`}>
      
      {children}
    </button>);

}

function normalizeOverlay(value: number | undefined, dark: boolean): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return dark ? 0.4 : 0.2;
  const normalized = value > 1 ? value / 100 : value;
  return Math.min(0.85, Math.max(0, normalized));
}