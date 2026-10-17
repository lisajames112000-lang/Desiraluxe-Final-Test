import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Text, Title } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { STORAGE_KEYS, readJSON, writeJSON } from '../../utils/storage';
import { isScheduleActive, nextScheduleBoundary } from '../../utils/schedule';
import { ImageWithFallback } from '../common/ImageWithFallback';

interface SeenRecord {[id: string]: string;}

export function PromoPopup() {
  const { popups, backendStatus, resourceStatuses } = useStore();
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const popupSourceReady = backendStatus.state === 'demo' || ['ready', 'empty'].includes(resourceStatuses.popups.state);
  const campaign = useMemo(() => popupSourceReady ? popups.filter((popup) => popup.isEnabled && isScheduleActive(popup, now) && (popup.routes.length === 0 || popup.routes.includes(location.pathname))).sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] : undefined, [location.pathname, now, popupSourceReady, popups]);

  useEffect(() => {
    const boundary = nextScheduleBoundary(popups, now);
    if (!boundary) return;
    const timer = window.setTimeout(() => setNow(new Date()), Math.min(boundary - now.getTime() + 100, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [now, popups]);

  useEffect(() => {
    setOpened(false);
    if (!campaign || ['/checkout', '/admin'].some((path) => location.pathname.startsWith(path))) return;
    const versionedId = `${campaign.id}.${campaign.campaignVersion || 1}`;
    const seen = readJSON<SeenRecord>(STORAGE_KEYS.popupSeen, {});
    const last = seen[versionedId];
    const todayKarachi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    let sessionSeen = false;
    try {sessionSeen = !!sessionStorage.getItem(`desiraluxe.popup.${versionedId}`);} catch {sessionSeen = true;}
    const canShow = campaign.frequency === 'session' ? !sessionSeen : campaign.frequency === 'day' ? last !== todayKarachi : !last;
    if (!canShow) return;
    const timer = window.setTimeout(() => setOpened(true), Math.min(30_000, Math.max(0, campaign.delayMs ?? 1800)));
    return () => window.clearTimeout(timer);
  }, [campaign, location.pathname]);

  if (!campaign) return null;
  const dismiss = () => {
    setOpened(false);
    const versionedId = `${campaign.id}.${campaign.campaignVersion || 1}`;
    if (campaign.frequency === 'session') {try {sessionStorage.setItem(`desiraluxe.popup.${versionedId}`, '1');} catch {/* Storage can be unavailable. */}} else
    {const seen = readJSON<SeenRecord>(STORAGE_KEYS.popupSeen, {});seen[versionedId] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());writeJSON(STORAGE_KEYS.popupSeen, seen);}
  };
  return <Modal opened={opened} onClose={dismiss} size="lg" centered radius="xl" padding={0} overlayProps={{ backgroundOpacity: 0.5, blur: 3 }} aria-labelledby="promo-title"><div className="grid max-h-[90vh] overflow-auto sm:grid-cols-2">{campaign.image && <ImageWithFallback src={campaign.image} alt="" width={1000} height={1200} className="h-full min-h-[220px] w-full object-cover" containerClassName="h-full min-h-[220px]" />}<div className="flex flex-col justify-center p-7 sm:p-9"><Text size="xs" tt="uppercase" fw={700} c="emerald.6" lts="0.16em">Desiraluxe</Text><Title id="promo-title" order={2} mt={6}>{campaign.title}</Title><Text c="dimmed" mt="md" lh={1.65}>{campaign.message}</Text>{campaign.ctaLabel && campaign.ctaHref && <Button component={Link} to={campaign.ctaHref} color="emerald" mt="xl" onClick={dismiss}>{campaign.ctaLabel}</Button>}</div></div></Modal>;
}