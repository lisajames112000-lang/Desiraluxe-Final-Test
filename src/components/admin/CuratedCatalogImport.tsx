import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Group, NumberInput, Progress, Text } from '@mantine/core';
import { PackagePlusIcon } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { categories as curatedCategories } from '../../data/categories';
import { heroSlides as curatedHeroSlides } from '../../data/heroSlides';
import { initialProducts as curatedProducts } from '../../data/products';
import { sourceToys } from '../../data/products/sourceToys';

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
function CuratedBuiltInImport() {
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

/** Independent of the built-in import: only missing, non-medication adult products. */
export function SourceToysImport() {
  const { products, categories, backendStatus, addProduct } = useStore();
  const latestProducts = useRef(products);
  latestProducts.current = products;
  const acknowledged = useRef(new Set<string>());
  const running = useRef(false);
  const [stock, setStock] = useState<string | number>(0);
  const [state, setState] = useState<ImportState>({ running: false, done: 0, total: 0, failures: [], finished: false });
  const missing = sourceToys.filter((item) => !acknowledged.current.has(item.id) && !products.some((existing) => existing.id === item.id || existing.slug === item.slug));
  const toysPublished = categories.some((item) => item.slug === 'toys' && item.isPublished);
  const validStock = typeof stock === 'number' && Number.isSafeInteger(stock) && stock >= 0;
  if (backendStatus.state === 'demo') return null;

  const run = async () => {
    if (running.current || !validStock || !toysPublished) return;
    running.current = true;
    const tasks = [...missing];
    const initialStock = Number(stock);
    const failures: string[] = [];
    setState({ running: true, done: 0, total: tasks.length, failures: [], finished: false });
    try {
      for (const [i, item] of tasks.entries()) {
        // Fresh context plus acknowledged writes prevents duplicates during retries.
        const exists = acknowledged.current.has(item.id) || latestProducts.current.some((existing) => existing.id === item.id || existing.slug === item.slug);
        if (!exists) {
          try {
            const result = await addProduct({ ...item, stock: initialStock });
            if (result.ok) acknowledged.current.add(item.id);
            else failures.push(item.id + ' (' + item.slug + '): ' + result.message);
          } catch (error) {
            failures.push(item.id + ' (' + item.slug + '): ' + (error instanceof Error ? error.message : String(error)));
          }
        }
        setState((current) => ({ ...current, done: i + 1, failures: [...failures] }));
      }
    } finally {
      running.current = false;
      setState((current) => ({ ...current, running: false, finished: true, failures: [...failures] }));
    }
  };

  return <Alert mt="md" color={state.finished && !state.failures.length ? 'green' : 'yellow'} icon={<PackagePlusIcon size={18} />} title="Import 110 adult products (18+ only)">
    <Text size="sm">Non-medication adult wellness catalog, not soft toys. Source names, prices and all images are preserved. Existing IDs or slugs are skipped, never overwritten. {missing.length} products remain.</Text>
    {!toysPublished && <Text c="red" size="sm" mt="sm">Publish the category with slug “toys” before importing.</Text>}
    <NumberInput mt="sm" label="Owner-confirmed initial stock per product" description="Enter an actual whole-number quantity for each imported product. Default 0 means out of stock; no inventory is assumed." min={0} allowDecimal={false} allowNegative={false} value={stock} onChange={setStock} disabled={state.running} />
    {!validStock && <Text size="sm" c="red">Stock must be a whole number of 0 or more.</Text>}
    {missing.length > 0 && <details className="mt-3"><summary>Missing product IDs and slugs ({missing.length})</summary><ul className="max-h-48 overflow-auto text-xs">{missing.map((item) => <li key={item.id}>{item.id}: {item.slug}</li>)}</ul></details>}
    {(state.running || state.finished) && <><Progress mt="sm" value={state.total ? state.done / state.total * 100 : 0} animated={state.running} aria-label="Adult catalog import progress" /><Text size="sm" mt="sm">{state.done} / {state.total} processed. {state.failures.length} failed.{state.finished && !state.failures.length ? ' All records in this batch are acknowledged or already present.' : ''}</Text></>}
    {state.failures.length > 0 && <ul className="mt-3 max-h-48 overflow-auto text-xs text-red-700">{state.failures.map((failure) => <li key={failure}>{failure}</li>)}</ul>}
    {missing.length > 0 && <Button mt="sm" color="emerald" loading={state.running} disabled={!toysPublished || !validStock} onClick={() => void run()}>{state.finished ? 'Retry remaining adult products' : 'Import missing adult products (18+)'}</Button>}
    {!missing.length && <Text size="sm" mt="sm">No missing source products. Existing records were not changed.</Text>}
  </Alert>;
}


/** Applies the owner's requested stock range only to this imported Toys catalog. */
export function SourceToysStockUpdate() {
  const { products, backendStatus, updateProduct } = useStore();
  const latestProducts = useRef(products);
  latestProducts.current = products;
  const running = useRef(false);
  const [state, setState] = useState<ImportState>({ running: false, done: 0, total: 0, failures: [], finished: false });
  const sourceIds = new Set(sourceToys.map((item) => item.id));
  const targets = products.filter((item) => sourceIds.has(item.id) && item.categorySlugs.includes('toys'));
  const pending = targets.filter((item) => !Number.isSafeInteger(item.stock) || item.stock < 400 || item.stock > 800);
  const configured = targets.length - pending.length;
  if (backendStatus.state === 'demo') return null;

  const run = async () => {
    if (running.current || targets.length !== sourceToys.length || !pending.length) return;
    running.current = true;
    const plan = pending.map((item) => ({ id: item.id, stock: 400 + Math.floor(Math.random() * 401) }));
    const failures: string[] = [];
    setState({ running: true, done: 0, total: plan.length, failures: [], finished: false });
    try {
      for (const [i, planned] of plan.entries()) {
        const current = latestProducts.current.find((item) => item.id === planned.id);
        if (!current || !current.categorySlugs.includes('toys')) {
          failures.push(planned.id + ': Product missing or category changed; no write made.');
        } else if (current.stock < 400 || current.stock > 800 || !Number.isSafeInteger(current.stock)) {
          try {
            const result = await updateProduct({ ...current, stock: planned.stock });
            if (!result.ok) failures.push(planned.id + ': ' + result.message);
          } catch (error) {
            failures.push(planned.id + ': ' + (error instanceof Error ? error.message : String(error)));
          }
        }
        setState((value) => ({ ...value, done: i + 1, failures: [...failures] }));
      }
    } finally {
      running.current = false;
      setState((value) => ({ ...value, running: false, finished: true, failures: [...failures] }));
    }
  };

  return <Alert mt="md" color={configured === sourceToys.length ? 'green' : 'blue'} icon={<PackagePlusIcon size={18} />} title="Toys stock: 400 to 800 units">
    <Text size="sm">Owner-requested inventory settings for the 110 imported Toys products only. Each pending product receives its own random whole-number quantity from 400 through 800, inclusive. Product names, prices, images and existing records outside this catalog are preserved.</Text>
    <Text size="sm" mt="sm">{configured} / {sourceToys.length} products have stock within the requested range. {pending.length} remain.</Text>
    {targets.length !== sourceToys.length && <Text size="sm" c="red">All 110 source products must be present before this stock update can run.</Text>}
    {(state.running || state.finished) && <><Progress mt="sm" value={state.total ? state.done / state.total * 100 : 0} animated={state.running} aria-label="Toys stock update progress" /><Text size="sm" mt="sm">{state.done} / {state.total} processed. {state.failures.length} failed.</Text></>}
    {state.failures.length > 0 && <ul className="mt-3 max-h-48 overflow-auto text-xs text-red-700">{state.failures.map((failure) => <li key={failure}>{failure}</li>)}</ul>}
    {pending.length > 0 && <Button mt="sm" color="emerald" loading={state.running} disabled={targets.length !== sourceToys.length} onClick={() => void run()}>{state.finished ? 'Retry remaining Toys stock updates' : 'Set Toys stock to random 400–800'}</Button>}
    {configured === sourceToys.length && <Text size="sm" mt="sm">All 110 Toys products now have stock from 400 through 800.</Text>}
  </Alert>;
}

export function CuratedCatalogImport() {
  return <><CuratedBuiltInImport /><SourceToysImport /><SourceToysStockUpdate /></>;
}
