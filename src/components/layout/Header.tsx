import React, { useMemo, useState } from 'react';
import { ActionIcon, Burger, Button, Drawer, Group, Menu, Text, TextInput } from '@mantine/core';
import { SearchIcon, ShoppingBagIcon, SparklesIcon, UserRoundIcon } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { Logo } from '../brand/Logo';

export function Header() {
  const { categories, cartCount, brandSettings } = useStore();
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const mainCats = useMemo(() => categories.filter((c) => c.isPublished).slice(0, 10), [categories]);
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpened(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      {brandSettings.announcementEnabled &&
      <div className="bg-emerald-forest px-4 py-2 text-white">
          <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2 text-center text-[11px] font-medium sm:text-xs">
            <SparklesIcon size={12} className="text-champagne" aria-hidden="true" />
            {brandSettings.announcementText}
            <Link to="/shop" className="hidden font-semibold text-white underline-offset-4 hover:underline md:inline">Shop now →</Link>
          </div>
        </div>
      }
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Burger opened={opened} onClick={() => setOpened(true)} aria-label="Open navigation" color="#0B4938" className="lg:hidden" />
          <Logo />
          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-xl md:block" role="search">
            <TextInput aria-label="Search products" value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder="Search products, categories…" leftSection={<SearchIcon size={16} />} rightSection={<ActionIcon type="submit" variant="subtle" color="emerald" aria-label="Submit search"><SearchIcon size={15} /></ActionIcon>} radius="xl" />
          </form>
          <Group gap={5} wrap="nowrap" ml="auto">
            <ActionIcon component={Link} to="/search" aria-label="Search" variant="subtle" color="emerald" size="lg" className="md:hidden"><SearchIcon size={20} /></ActionIcon>
            <ActionIcon component={Link} to="/admin" aria-label="Owner admin" variant="subtle" color="emerald" size="lg" className="hidden sm:flex"><UserRoundIcon size={20} /></ActionIcon>
            <div className="relative">
              <ActionIcon component={Link} to="/cart" aria-label={`Shopping cart with ${cartCount} items`} variant="subtle" color="emerald" size="lg"><ShoppingBagIcon size={21} /></ActionIcon>
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-deep px-1 text-[10px] font-bold text-white">{cartCount > 99 ? '99+' : cartCount}</span>}
            </div>
          </Group>
        </div>
        <nav aria-label="Primary navigation" className="hidden border-t border-line/70 lg:block">
          <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-8 px-6">
            <NavLink to="/" end className={({ isActive }) => `border-b-2 px-1 py-3 text-sm font-semibold no-underline transition-colors ${isActive ? 'border-emerald-deep text-emerald-deep' : 'border-transparent text-ink hover:text-emerald-deep'}`}>Home</NavLink>
            <Menu trigger="hover" openDelay={80} closeDelay={130} position="bottom-start" shadow="lg" radius="lg" width={680}>
              <Menu.Target><button className="border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-ink hover:text-emerald-deep">Shop & categories</button></Menu.Target>
              <Menu.Dropdown p="md">
                <div className="grid grid-cols-3 gap-1">
                  {categories.filter((c) => c.isPublished).map((c) => <Menu.Item component={Link} to={`/category/${c.slug}`} key={c.id} onClick={() => setOpened(false)}>{c.name}</Menu.Item>)}
                </div>
                <Menu.Divider />
                <Group justify="space-between"><Menu.Item component={Link} to="/shop" fw={700}>Shop all products</Menu.Item><Menu.Item component={Link} to="/categories" fw={700}>View all categories</Menu.Item></Group>
              </Menu.Dropdown>
            </Menu>
            {mainCats.slice(0, 7).map((c) => <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => `border-b-2 px-1 py-3 text-sm no-underline ${isActive ? 'border-emerald-deep font-semibold text-emerald-deep' : 'border-transparent text-ink hover:text-emerald-deep'}`}>{c.name}</NavLink>)}
          </div>
        </nav>
      </header>
      <Drawer opened={opened} onClose={() => setOpened(false)} title={<Logo />} padding="md" size="sm">
        <form onSubmit={submitSearch} className="mb-5" role="search"><TextInput label="Search products" value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder="Search Desiraluxe" leftSection={<SearchIcon size={16} />} /></form>
        <div className="flex flex-col">
          {[['Home', '/'], ['Shop all', '/shop'], ['All categories', '/categories']].map(([label, href]) => <Button key={href} component={Link} to={href} onClick={() => setOpened(false)} variant="subtle" color="dark" justify="start">{label}</Button>)}
          <Text mt="lg" mb="xs" px="md" size="xs" tt="uppercase" fw={700} c="dimmed" lts="0.12em">Categories</Text>
          {categories.filter((c) => c.isPublished).map((c) => <Button key={c.id} component={Link} to={`/category/${c.slug}`} onClick={() => setOpened(false)} variant="subtle" color="dark" justify="start">{c.name}</Button>)}
          <Button component={Link} to="/admin" onClick={() => setOpened(false)} color="emerald" variant="light" mt="lg" leftSection={<UserRoundIcon size={17} />}>Owner admin preview</Button>
        </div>
      </Drawer>
    </>);

}