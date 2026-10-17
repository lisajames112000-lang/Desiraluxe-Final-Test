import type { PromoPopup } from '../types/settings';

export const popups: PromoPopup[] = [
{
  id: 'popup_preview_welcome',
  title: 'A beautiful discovery awaits',
  message: 'Explore a curated preview of Desiraluxe. All products and checkout actions are sample-only until the owner verifies real inventory and payment details.',
  image: "/9a7d1331-27eb-4f59-9538-d5e531f8fbd6.jpg",
  ctaLabel: 'Browse new arrivals',
  ctaHref: '/shop?sort=newest',
  isEnabled: true,
  routes: ['/'],
  frequency: 'session'
}];