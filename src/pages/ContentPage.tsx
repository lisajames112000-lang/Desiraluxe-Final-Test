import React from 'react';
import { Container, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BreadcrumbsNav } from '../components/common/BreadcrumbsNav';
import { EmptyState } from '../components/common/EmptyState';
import { LiveDataState } from '../components/common/LiveDataState';

interface ContentPageProps {slugOverride?: string;}

export function ContentPage({ slugOverride }: ContentPageProps) {
  const params = useParams();
  const slug = slugOverride || params.slug || '';
  const { cmsPages, resourceStatuses } = useStore();
  const page = cmsPages.find((p) => p.slug === slug);
  useDocumentMeta(page ? `${page.title} | Desiraluxe` : 'Page not found | Desiraluxe', page?.content.slice(0, 155) || 'The requested page could not be found.');
  if (!page) return <main className="py-20"><Container size="md"><LiveDataState status={resourceStatuses.cmsPages} hasData={cmsPages.length > 0} loadingLabel="Loading published content…" emptyTitle="No published pages yet" emptyDescription="The store is connected, but no CMS pages have been published."><EmptyState title="Page not found" description="The page may have moved or has not been published." actionLabel="Return home" actionHref="/" /></LiveDataState></Container></main>;
  return <main className="min-h-[65vh] py-10 sm:py-16"><Container size="md"><BreadcrumbsNav items={[{ label: 'Home', href: '/' }, { label: page.title }]} /><Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.16em">Desiraluxe information</Text><Title order={1} mt={8} className="!text-4xl sm:!text-5xl">{page.title}</Title><div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-10"><Text lh={1.9} size="md" style={{ whiteSpace: 'pre-wrap' }}>{page.content}</Text>{['privacy', 'terms', 'shipping', 'returns'].includes(slug) && <div className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Draft preview content.</strong> This page must be reviewed and configured for the actual business, region, and service before production launch.</div>}</div></Container></main>;
}