import { expect, test } from '@playwright/test';

test('storefront routes and demo limitations are explicit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Desiraluxe home/i })).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText(/Firebase is not configured|Sign in with the existing authorized/i)).toBeVisible();
});

test('search stays synchronized with its URL', async ({ page }) => {
  await page.goto('/search?q=bag');
  await expect(page.getByLabel('Search products')).toHaveValue('bag');
  await page.goto('/search?q=watch');
  await expect(page.getByLabel('Search products')).toHaveValue('watch');
});