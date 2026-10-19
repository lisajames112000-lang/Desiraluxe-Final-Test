import React from 'react';
import { Outlet } from 'react-router-dom';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { Footer } from './Footer';
import { Header } from './Header';
import { PromoPopup } from '../storefront/PromoPopup';
import { SupportChat } from '../support/SupportChat';

export function StorefrontLayout() {
  useScrollToTop();
  return (
    <div className="min-h-screen w-full bg-warmwhite">
      <Header />
      <Outlet />
      <Footer />
      <PromoPopup />
      <SupportChat />
    </div>);

}