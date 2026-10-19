import React, { Suspense, lazy } from 'react';
import { Center, Loader, MantineProvider } from '@mantine/core';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { theme } from './utils/mantineTheme';
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Categories } from './pages/Categories';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Search } from './pages/Search';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { TrackOrder } from './pages/TrackOrder';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { ContentPage } from './pages/ContentPage';
import { NotFound } from './pages/NotFound';
import { PersistenceStatus } from './components/common/PersistenceStatus';

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories').then((m) => ({ default: m.AdminCategories })));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments').then((m) => ({ default: m.AdminPayments })));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners').then((m) => ({ default: m.AdminBanners })));
const AdminPopups = lazy(() => import('./pages/admin/AdminPopups').then((m) => ({ default: m.AdminPopups })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminContent = lazy(() => import('./pages/admin/AdminContent').then((m) => ({ default: m.AdminContent })));
const AdminData = lazy(() => import('./pages/admin/AdminData').then((m) => ({ default: m.AdminData })));
const AdminAccount = lazy(() => import('./pages/admin/AdminAccount').then((m) => ({ default: m.AdminAccount })));
const AdminSupport = lazy(() => import('./components/support/SupportChat').then((m) => ({ default: m.AdminSupport })));
const AdminEnquiries = lazy(() => import('./pages/admin/AdminEnquiries').then((m) => ({ default: m.AdminEnquiries })));

function LoadingScreen() {
  return <Center mih="60vh"><Loader color="emerald" size="lg" /></Center>;
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <BrowserRouter>
        <AdminAuthProvider>
          <StoreProvider>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/category/:slug" element={<Category />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/shipping" element={<ContentPage slugOverride="shipping" />} />
                  <Route path="/returns" element={<ContentPage slugOverride="returns" />} />
                  <Route path="/privacy" element={<ContentPage slugOverride="privacy" />} />
                  <Route path="/terms" element={<ContentPage slugOverride="terms" />} />
                  <Route path="/pages/:slug" element={<ContentPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="/admin" element={<AdminLogin />} />
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/categories" element={<AdminCategories />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/payments" element={<AdminPayments />} />
                  <Route path="/admin/banners" element={<AdminBanners />} />
                  <Route path="/admin/popups" element={<AdminPopups />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/content" element={<AdminContent />} />
                  <Route path="/admin/enquiries" element={<AdminEnquiries />} />
                  <Route path="/admin/support" element={<AdminSupport />} />
                  <Route path="/admin/data" element={<AdminData />} />
                  <Route path="/admin/account" element={<AdminAccount />} />
                </Route>
              </Routes>
            </Suspense>
            <PersistenceStatus />
            <Toaster position="bottom-right" richColors />
          </StoreProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </MantineProvider>);

}