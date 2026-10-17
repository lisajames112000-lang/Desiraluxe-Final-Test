import React from 'react';
import { Button, Container, Group, Text, Title } from '@mantine/core';
import { HomeIcon, SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export function NotFound() {
  useDocumentMeta('Page not found | Desiraluxe', 'The requested Desiraluxe page could not be found.', true);
  return <main className="flex min-h-[65vh] items-center bg-sage py-16"><Container size="sm" className="text-center"><Text className="font-serif !text-[9rem] !leading-none !text-emerald-deep/10 sm:!text-[12rem]">404</Text><Title order={1} className="!-mt-10 !text-4xl sm:!-mt-14">This discovery is out of reach.</Title><Text c="dimmed" mt="md" lh={1.7}>The page may have moved, or the link may no longer be available.</Text><Group justify="center" mt="xl"><Button component={Link} to="/" color="emerald" leftSection={<HomeIcon size={17} />}>Return home</Button><Button component={Link} to="/search" variant="outline" color="emerald" leftSection={<SearchIcon size={17} />}>Search products</Button></Group></Container></main>;
}