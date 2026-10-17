import { decorProducts } from './decor';
import { dressesProducts } from './dresses';
import { electronicsProducts } from './electronics';
import { eyewearProducts } from './eyewear';
import { footwearProducts } from './footwear';
import { handbagsProducts } from './handbags';
import { jewelleryProducts } from './jewellery';
import { machinesProducts } from './machines';
import { perfumesProducts } from './perfumes';
import { toolsProducts } from './tools';
import { toysProducts } from './toys';
import { watchesProducts } from './watches';

// Curated imported luxury catalog: 12 categories, 61 products, each with its own unique photograph.
export const initialProducts = [
...dressesProducts,
...perfumesProducts,
...watchesProducts,
...eyewearProducts,
...handbagsProducts,
...jewelleryProducts,
...footwearProducts,
...electronicsProducts,
...machinesProducts,
...toolsProducts,
...toysProducts,
...decorProducts];