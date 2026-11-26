export interface PriceItem {
  id: number;
  name: string;
  price: string;
  unit?: string;
  costType?: 'percent' | 'fixed';
  /** Stable quantity identifier, independent of the editable display name. */
  quantityKey?: string;
}

export interface PricesData {
  currency: string;
  steelUnified: string;
  concrete: PriceItem[];
  preliminary: PriceItem[];
  block: PriceItem[];
  labor: PriceItem[];
  other: PriceItem[];
  finishesMaterials: PriceItem[];
  finishesLabor: PriceItem[];
  finishesExtra: PriceItem[];
  doorsAndWindows: PriceItem[];
  blockMode: 'm2' | 'unit';
  /** Optional for compatibility with projects saved before detailed utility pricing. */
  electricalMaterials?: PriceItem[];
  plumbingMaterials?: PriceItem[];
}

export type PriceSection = {
  [K in keyof PricesData]-?: NonNullable<PricesData[K]> extends PriceItem[] ? K : never;
}[keyof PricesData];

/** Prices are snapshots, not references to the latest global price list. */
export interface ProjectPricesStore {
  version: 1;
  latest: PricesData;
  projects: Record<string, PricesData>;
}

/** Same identity used by finalQuantityCalculations for diameter-specific items. */
export const plumbingPriceKey = (material: string, diameter: string): string =>
  `plumbing:${JSON.stringify([material.trim(), diameter.trim()])}`;
