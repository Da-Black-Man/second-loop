export type CatalogProduct = {
  id: string;
  name: string;
  originalPrice: number;
  aliases: string[];
};

export const retailCatalog: CatalogProduct[] = [
  {
    id: 'airpods-pro-2',
    name: 'Apple AirPods Pro (2nd gen)',
    originalPrice: 249,
    aliases: ['airpods pro 2', 'airpods pro second generation', 'apple airpods pro'],
  },
  {
    id: 'sony-xm5',
    name: 'Sony WH-1000XM5',
    originalPrice: 399.99,
    aliases: ['sony wh 1000xm5', 'sony xm5', 'wh1000xm5'],
  },
  {
    id: 'switch-oled',
    name: 'Nintendo Switch OLED',
    originalPrice: 349.99,
    aliases: ['nintendo switch oled', 'switch oled'],
  },
  {
    id: 'kitchenaid-artisan',
    name: 'KitchenAid Artisan Stand Mixer',
    originalPrice: 449.99,
    aliases: ['kitchenaid artisan', 'artisan stand mixer', 'kitchenaid mixer'],
  },
  {
    id: 'dyson-v15',
    name: 'Dyson V15 Detect',
    originalPrice: 749.99,
    aliases: ['dyson v15 detect', 'dyson v15'],
  },
  {
    id: 'patagonia-nano-puff',
    name: 'Patagonia Nano Puff Jacket',
    originalPrice: 239,
    aliases: ['patagonia nano puff', 'nano puff jacket'],
  },
  {
    id: 'le-creuset-dutch-oven',
    name: 'Le Creuset 5.5 qt Dutch Oven',
    originalPrice: 419.95,
    aliases: ['le creuset 5.5', 'le creuset dutch oven', '5.5 qt dutch oven'],
  },
  {
    id: 'aeron-remastered',
    name: 'Herman Miller Aeron Chair',
    originalPrice: 1805,
    aliases: ['herman miller aeron', 'aeron chair', 'aeron remastered'],
  },
  {
    id: 'iphone-15-pro',
    name: 'Apple iPhone 15 Pro',
    originalPrice: 999,
    aliases: ['iphone 15 pro', 'apple iphone 15 pro'],
  },
  {
    id: 'macbook-air-m2',
    name: 'Apple MacBook Air M2',
    originalPrice: 999,
    aliases: ['macbook air m2', 'apple m2 macbook air', 'm2 air'],
  },
  {
    id: 'bose-qc-ultra',
    name: 'Bose QuietComfort Ultra Headphones',
    originalPrice: 429,
    aliases: ['bose quietcomfort ultra', 'bose qc ultra'],
  },
  {
    id: 'lego-rivendell',
    name: 'LEGO Icons Rivendell 10316',
    originalPrice: 499.99,
    aliases: ['lego rivendell 10316', 'lego 10316', 'lego rivendell'],
  },
];

const ignoredWords = new Set([
  'a', 'an', 'and', 'the', 'with', 'for', 'used', 'new', 'like', 'excellent',
  'condition', 'bundle', 'only', 'sale', 'great', 'black', 'white', 'blue', 'red',
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 1 && !ignoredWords.has(token));
}

export function findRetailMatch(title: string) {
  const normalizedTitle = normalize(title);
  let best: { product: CatalogProduct; confidence: number; matchType: 'exact' | 'likely' } | null = null;

  for (const product of retailCatalog) {
    for (const alias of product.aliases) {
      const normalizedAlias = normalize(alias);
      const aliasTokens = tokens(alias);
      const titleTokens = new Set(tokens(title));
      const overlap = aliasTokens.filter((token) => titleTokens.has(token)).length;
      const coverage = aliasTokens.length ? overlap / aliasTokens.length : 0;
      const exactPhrase = normalizedTitle.includes(normalizedAlias);
      const confidence = exactPhrase
        ? Math.min(0.99, 0.92 + Math.min(aliasTokens.length, 4) * 0.015)
        : coverage >= 0.8 && overlap >= 2
          ? 0.78 + Math.min(0.1, overlap * 0.025)
          : 0;

      if (confidence && (!best || confidence > best.confidence)) {
        best = {
          product,
          confidence,
          matchType: confidence >= 0.9 ? 'exact' : 'likely',
        };
      }
    }
  }

  if (!best) return null;
  return {
    id: best.product.id,
    name: best.product.name,
    originalPrice: best.product.originalPrice,
    confidence: Number(best.confidence.toFixed(2)),
    matchType: best.matchType,
  };
}
