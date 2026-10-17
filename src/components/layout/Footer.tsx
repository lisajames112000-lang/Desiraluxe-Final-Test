import React from 'react';
import { Button, Text } from '@mantine/core';
import { MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { Logo } from '../brand/Logo';

const groups = [
{ title: 'Quick links', links: [['Home', '/'], ['About us', '/about'], ['Contact', '/contact'], ['Owner admin', '/admin']] },
{ title: 'Shop', links: [['All products', '/shop'], ['Categories', '/categories'], ['New arrivals', '/shop?sort=newest'], ['Featured', '/shop?sort=featured']] },
{ title: 'Customer care', links: [['Shipping', '/shipping'], ['Returns & exchanges', '/returns'], ['Track order', '/track-order'], ['Privacy', '/privacy'], ['Terms', '/terms']] }];


export function Footer() {
  const { brandSettings, isPreviewMode } = useStore();
  return (
    <footer className="mt-20 bg-emerald-forest text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.2fr_2fr_1.1fr] lg:px-10">
        <div>
          <Logo variant="light" />
          <Text size="sm" c="rgba(255,255,255,.72)" mt="lg" lh={1.7}>Thoughtfully selected finds across fashion, home, beauty, technology, and everyday life.</Text>
          <div className="mt-5 space-y-2 text-sm text-white/70">
            <div className="flex gap-2"><MailIcon size={16} /> {brandSettings.contactEmail}</div>
            <div className="flex gap-2"><PhoneIcon size={16} /> {brandSettings.contactPhone}</div>
            <div className="flex gap-2"><MapPinIcon size={16} /> {brandSettings.contactAddress}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((g) => <div key={g.title}><h3 className="mb-4 font-sans text-sm font-bold">{g.title}</h3><ul className="space-y-3">{g.links.map(([label, href]) => <li key={href}><Link to={href} className="text-sm text-white/70 no-underline hover:text-white">{label}</Link></li>)}</ul></div>)}
        </div>
        <div>
          <h3 className="font-sans text-sm font-bold">Stay connected</h3>
          <Text size="sm" c="rgba(255,255,255,.68)" mt="md" lh={1.7}>Social profiles and newsletter delivery can be configured by the owner when genuine destinations and a messaging service are available.</Text>
          <Button component={Link} to="/contact" color="champagne" mt="lg" leftSection={<MessageCircleIcon size={17} />}>Contact Desiraluxe</Button>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/60">© 2026 Desiraluxe.{isPreviewMode ? ' Demo catalog — sample inventory and checkout disabled.' : ' All rights reserved.'}</div>
    </footer>);

}