import React, { useMemo } from 'react';
import { Button, Container, Text, Title } from '@mantine/core';
import { ArrowRightIcon, HeadphonesIcon, RefreshCcwIcon, ShieldCheckIcon, TruckIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PreviewNotice } from '../components/common/PreviewNotice';
import { SectionHeading } from '../components/common/SectionHeading';
import { LiveDataState } from '../components/common/LiveDataState';
import { CategoryCard } from '../components/storefront/CategoryCard';
import { CheckoutGuidance } from '../components/storefront/CheckoutGuidance';
import { HeroCarousel } from '../components/storefront/HeroCarousel';
import { ProductGrid } from '../components/storefront/ProductGrid';
import { GridEmptyState } from '../components/storefront/GridEmptyState';

export function Home() {
  const { categories, products, heroSlides, brandSettings, isPreviewMode, resourceStatuses } = useStore();
  useDocumentMeta('Desiraluxe — Imported luxury, beautifully curated', 'Shop imported luxury watches, designer dresses, brand perfumes, designer eyewear, fine jewellery, electronics, machines, tools, toys, and home décor.');
  const featured = useMemo(() => products.filter((product) => product.isPublished && product.isFeatured).slice(0, 8), [products]);
  const newest = useMemo(() => [...products].filter((product) => product.isPublished && product.isNewArrival).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8), [products]);
  const featureCats = useMemo(() => categories.filter((category) => category.isFeatured && category.isPublished).slice(0, 8), [categories]);
  const enabled = brandSettings.homepageSectionsEnabled || {};
  const configuredOrder = brandSettings.homepageSectionOrder || [];
  const fallbackOrder = ['hero', 'categories', 'featured', 'showcase', 'new-arrivals', 'category-spotlight', 'guidance', 'highlights'];
  const order = [...configuredOrder, ...fallbackOrder.filter((id) => !configuredOrder.includes(id))];
  const highlights = [
  { icon: TruckIcon, title: 'Configured delivery', text: 'Fees and destinations are verified at checkout' },
  { icon: ShieldCheckIcon, title: 'Secure checkout', text: 'Prices and stock are revalidated by the server' },
  { icon: RefreshCcwIcon, title: 'Clear order review', text: 'Payment and fulfilment states stay transparent' },
  { icon: HeadphonesIcon, title: 'Owner support', text: 'Contact enquiries are recorded for review' }];


  const sections: Record<string, React.ReactNode> = {
    hero: <div className="mt-4"><HeroCarousel slides={heroSlides} /></div>,
    categories: <section aria-labelledby="categories-title" className="py-14 sm:py-20"><SectionHeading eyebrow="Explore by collection" title="Find your next favourite" description="Browse curated collections across Desiraluxe." actionLabel="View all categories" actionHref="/categories" /><LiveDataState status={resourceStatuses.categories} hasData={featureCats.length > 0} loadingLabel="Loading published categories…" emptyTitle="No featured categories yet" emptyDescription="Published categories are connected, but none are marked as featured." emptyFallback={<GridEmptyState variant="categories" placeholders={8} title="No featured categories yet" description="The store is connected, but no published categories are marked as featured." actionLabel="View all categories" actionHref="/categories" />}><div id="categories-title" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-8">{featureCats.map((category) => <CategoryCard category={category} key={category.id} />)}</div></LiveDataState></section>,
    featured: <section aria-labelledby="featured-title" className="pb-14 sm:pb-20"><SectionHeading eyebrow="Handpicked for you" title="Featured finds" description="A considered edit from across Desiraluxe." actionLabel="Shop all" actionHref="/shop" /><div id="featured-title"><LiveDataState status={resourceStatuses.products} hasData={featured.length > 0} loadingLabel="Loading published products…" emptyTitle="No featured products yet" emptyDescription="Published products are connected, but none are marked as featured." actionLabel="Browse the shop" actionHref="/shop" emptyFallback={<GridEmptyState title="No featured products yet" description="The store is connected, but no published products are marked as featured." actionLabel="Browse the shop" actionHref="/shop" />}><ProductGrid products={featured} /></LiveDataState></div></section>,
    showcase: <section aria-labelledby="showcase-title" className="relative mb-14 overflow-hidden rounded-[1.75rem] bg-emerald-forest sm:mb-20"><img src="/f44e7b80-6168-4413-8fa5-402766fca025.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" loading="lazy" width="1600" height="700" /><div className="relative flex min-h-[260px] flex-col items-start justify-center px-8 py-12 sm:px-14 lg:px-20"><Text size="xs" tt="uppercase" fw={700} c="#D9C69E" lts="0.16em">Luxury looks, better choices</Text><Title id="showcase-title" order={2} c="white" mt={5} className="!text-3xl sm:!text-4xl">Make everyday feel considered.</Title><Text c="rgba(255,255,255,.78)" mt="sm" maw={550}>Explore beautiful essentials across home, style, technology, travel, and gifting.</Text><Button component={Link} to="/shop" color="champagne" mt="xl" rightSection={<ArrowRightIcon size={17} />}>Shop the collection</Button></div></section>,
    'new-arrivals': <section aria-labelledby="new-title" className="pb-14 sm:pb-20"><SectionHeading eyebrow="Just added" title="New arrivals" description="Fresh additions across every part of your day." actionLabel="View all new arrivals" actionHref="/shop?sort=newest" /><div id="new-title"><LiveDataState status={resourceStatuses.products} hasData={newest.length > 0} loadingLabel="Loading published products…" emptyTitle="No new arrivals yet" emptyDescription="Published products are connected, but none are marked as new arrivals." emptyFallback={<GridEmptyState title="No new arrivals yet" description="The store is connected, but no published products are marked as new arrivals." />}><ProductGrid products={newest} /></LiveDataState></div></section>,
    'category-spotlight': <section aria-label="Collection spotlights" className="grid gap-5 pb-14 sm:grid-cols-2 sm:pb-20 lg:grid-cols-3">{categories.filter((category) => ['home-machines', 'power-tools', 'imported-toys'].includes(category.slug) && category.isPublished).map((category, index) => <div key={category.id} className={index === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}><CategoryCard category={category} size="lg" /></div>)}</section>,
    guidance: <CheckoutGuidance />,
    highlights: <section aria-label="Store benefits" className="grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-4">{highlights.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3 rounded-2xl border border-line bg-white p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-emerald-deep"><Icon size={19} aria-hidden="true" /></span><div><Text fw={700} size="sm">{title}</Text><Text c="dimmed" size="xs" mt={3}>{text}</Text></div></div>)}</section>
  };

  return <main><Container size={1440} px={{ base: 12, sm: 24, lg: 32 }} py="md">{isPreviewMode && <PreviewNotice compact />}{order.filter((id) => enabled[id] !== false).map((id) => <React.Fragment key={id}>{sections[id]}</React.Fragment>)}</Container></main>;
}