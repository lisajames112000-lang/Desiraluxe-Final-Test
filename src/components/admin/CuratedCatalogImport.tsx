import React, { useMemo, useState } from 'react';
import { Alert, Button, Group, Progress, Text } from '@mantine/core';
import { PackagePlusIcon } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { categories as curatedCategories } from '../../data/categories';
import { heroSlides as curatedHeroSlides } from '../../data/heroSlides';
import { initialProducts as curatedProducts } from '../../data/products';

interface ImportState {
  running: boolean;
  done: number;
  total: number;
  failures: string[];
  finished: boolean;
}

/**
 * Lets the owner publish the curated imported catalog (categories, products, hero slides)
 * into the live store so every item becomes editable from the admin.
 */
export function CuratedCatalogImport() {
  const { products, categories, heroSlides, backendStatus, addCategory, addProduct, addHeroSlide } = useStore();
  const [state, setState] = useState<ImportState>({ running: false, done: 0, total: 0, failures: [], finished: false });

  const missing = useMemo(() => {
    const productIds = new Set(products.map((item) => item.id));
    const productSlugs = new Set(products.map((item) => item.slug));
    const categoryIds = new Set(categories.map((item) => item.id));
    const categorySlugs = new Set(categories.map((item) => item.slug));
    const slideIds = new Set(heroSlides.map((item) => item.id));
    return {
      categories: curatedCategories.filter((item) => !categoryIds.has(item.id) && !categorySlugs.has(item.slug)),
      products: curatedProducts.filter((item) => !productIds.has(item.id) && !productSlugs.has(item.slug)),
      heroSlides: curatedHeroSlides.filter((item) => !slideIds.has(item.id))
    };
  }, [categories, heroSlides, products]);

  const remaining = missing.categories.length + missing.products.length + missing.heroSlides.length;
  if (backendStatus.state === 'demo') return null;
  if (!remaining && !state.finished) return null;

  const run = async () => {
    const tasks: Array<{label: string;action: () => Promise<{ok: boolean;message: string;}>;}> = [
    ...missing.categories.map((item) => ({ label: `Category “${item.name}”`, action: () => addCategory(item) })),
    ...missing.products.map((item) => ({ label: `Product “${item.name}”`, action: () => addProduct(item) })),
    ...missing.heroSlides.map((item) => ({ label: `Hero slide “${item.headline}”`, action: () => addHeroSlide(item) }))];

    setState({ running: true, done: 0, total: tasks.length, failures: [], finished: false });
    const failures: string[] = [];
    for (const [i, task] of tasks.entries()) {
      const result = await task.action();
      if (!result.ok) failures.push(`${task.label}: ${result.message}`);
      setState((current) => ({ ...current, done: i + 1, failures: [...failures] }));
    }
    setState((current) => ({ ...current, running: false, finished: true }));
  };

  const percent = state.total ? Math.round(state.done / state.total * 100) : 0;

  return (
    <Alert mt="md" color={state.finished && !state.failures.length ? 'green' : 'emerald'} variant="light" icon={<PackagePlusIcon size={18} />} title={state.finished ? 'Curated catalog import finished' : 'Publish the curated imported catalog'}>
      {!state.finished &&
      <Text size="sm">
          Your storefront is currently showing the built-in curated collection. Publish it to the live store to edit, re-price, or remove each item from here:
          {' '}<strong>{missing.products.length} products</strong>, <strong>{missing.categories.length} categories</strong>, and <strong>{missing.heroSlides.length} hero slides</strong>. Existing records are never overwritten.
        </Text>
      }
      {state.finished &&
      <Text size="sm">
          {state.total - state.failures.length} of {state.total} records were saved.{state.failures.length ? ' Some records could not be saved — review the details below and retry.' : ' Every item is now editable from the admin.'}
        </Text>
      }
      {(state.running || state.finished) && <Progress mt="sm" value={percent} color="emerald" animated={state.running} aria-label="Import progress" />}
      {state.failures.length > 0 &&
      <ul className="mt-3 max-h-40 list-disc overflow-auto pl-5 text-xs text-red-700">
          {state.failures.map((failure) => <li key={failure}>{failure}</li>)}
        </ul>
      }
      {remaining > 0 &&
      <Group mt="sm">
          <Button color="emerald" size="sm" loading={state.running} onClick={run} leftSection={<PackagePlusIcon size={16} />}>
            {state.finished ? 'Retry remaining items' : 'Publish curated catalog'}
          </Button>
          {state.running && <Text size="xs" c="dimmed">{state.done} / {state.total} saved…</Text>}
        </Group>
      }
    </Alert>);

}