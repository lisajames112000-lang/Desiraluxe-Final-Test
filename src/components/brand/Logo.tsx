import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';

interface LogoProps {variant?: 'default' | 'light';compact?: boolean;to?: string;}

export function Logo({ variant = 'default', compact = false, to = '/' }: LogoProps) {
  const { brandSettings } = useStore();
  const ink = variant === 'light' ? 'text-white' : 'text-emerald-forest';
  const desktopHeight = Math.min(88, Math.max(32, brandSettings.logoDesktopHeight || 76));
  const mobileHeight = Math.min(64, Math.max(28, brandSettings.logoMobileHeight || 52));
  return <Link to={to} className="inline-flex min-w-0 shrink items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-deep" aria-label={`${brandSettings.logoText || 'Desiraluxe'} home`}>{brandSettings.logoUrl ? <img src={brandSettings.logoUrl} alt={brandSettings.logoAlt || brandSettings.logoText || 'Desiraluxe'} className="h-auto max-w-[145px] object-contain sm:max-w-[220px] lg:max-w-[300px]" style={{ maxHeight: `clamp(${mobileHeight}px, 5vw, ${desktopHeight}px)` }} /> : <><span className={`relative flex h-11 w-11 shrink-0 items-center justify-center border border-[#BDA679] font-serif text-2xl font-semibold ${ink}`} style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)' }}>D<span className="absolute right-1 top-0 text-[8px] text-[#BDA679]">♛</span></span>{!compact && <span className="flex min-w-0 flex-col leading-none"><span className={`truncate font-serif text-lg font-semibold tracking-[0.08em] sm:text-2xl sm:tracking-[0.12em] ${ink}`}>{brandSettings.logoText || 'DESIRALUXE'}</span>{brandSettings.logoTagline && <span className="mt-1 truncate text-[7px] font-semibold tracking-[0.2em] text-[#BDA679] sm:tracking-[0.38em]">{brandSettings.logoTagline}</span>}</span>}</>}</Link>;
}