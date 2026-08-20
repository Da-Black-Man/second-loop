import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { findRetailMatch } from './catalog.js';
import { getListingPhotos, searchMarketplace } from './mcpClient.js';
import type { Listing, Marketplace, SearchResponse } from '../src/types.js';

const app = express();
const port = Number(process.env.PORT || 5173);
const isProduction = process.env.NODE_ENV === 'production';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

app.use(express.json({ limit: '32kb' }));

const allowedImageHosts = [
  'images.unsplash.com',
  'i.ebayimg.com',
  'media-photos.depop.com',
];

function isAllowedImageHost(hostname: string) {
  return allowedImageHosts.includes(hostname)
    || hostname.endsWith('.fbcdn.net')
    || hostname.endsWith('.ebayimg.com')
    || hostname.endsWith('.cloudfront.net');
}

function canonicalizeLocation(value: string) {
  const key = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const knownLocations: Record<string, string> = {
    phoenix: 'Phoenix, Arizona, United States',
    'phoenix, az': 'Phoenix, Arizona, United States',
    nyc: 'New York City, New York, United States',
    'new york': 'New York City, New York, United States',
    la: 'Los Angeles, California, United States',
    'los angeles': 'Los Angeles, California, United States',
    'san francisco': 'San Francisco, California, United States',
  };
  return knownLocations[key] || value;
}

function numberOrUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function listingUrl(marketplace: Marketplace, id: string) {
  if (marketplace === 'facebook') return `https://www.facebook.com/marketplace/item/${id}`;
  if (marketplace === 'ebay') {
    const itemId = id.includes('|') ? id.split('|')[1] : id;
    return `https://www.ebay.com/itm/${itemId}`;
  }
  if (marketplace === 'depop') return `https://www.depop.com/products/${id}`;
  return `https://poshmark.com/listing/${id}`;
}

function upgradeMarketplaceImage(marketplace: Marketplace, url: string) {
  if (marketplace === 'depop') return url.replace(/\/P\d+\.(jpe?g|webp)(?=$|\?)/i, '/P0.$1');
  if (marketplace === 'ebay') return url.replace(/s-l\d+\.(jpe?g|webp)(?=$|\?)/i, 's-l800.$1');
  return url;
}

function parseMcpResults(text: string, marketplace: Marketplace): Listing[] {
  const lines = text.split('\n');
  const listings: Listing[] = [];
  let current: Partial<Listing> | null = null;

  const flush = () => {
    if (!current?.id || !current.title || current.price === undefined) return;
    listings.push({
      id: current.id,
      title: current.title,
      price: current.price,
      priceLabel: current.priceLabel || `$${current.price.toFixed(2)}`,
      currency: current.currency || 'USD',
      location: current.location,
      image: current.image,
      images: current.images,
      url: listingUrl(marketplace, current.id),
      marketplace,
      condition: current.condition,
      retailMatch: findRetailMatch(current.title),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const product = line.match(/^(?:•\s*)?\*\*(.+?)\*\*\s*-\s*(.+)$/);
    if (product) {
      flush();
      const priceLabel = product[1].trim();
      const price = Number(priceLabel.replace(/[^0-9.]/g, ''));
      current = {
        title: product[2].trim(),
        price: Number.isFinite(price) ? price : 0,
        priceLabel,
        currency: priceLabel.includes('£') ? 'GBP' : priceLabel.includes('€') ? 'EUR' : 'USD',
        marketplace,
      };
      continue;
    }
    if (!current) continue;
    const idMatch = line.match(/🆔\s*(.+)$/);
    const locationMatch = line.match(/📍\s*(.+)$/);
    const imageMatch = line.match(/🖼️\s*Images:\s*(.+)$/);
    if (idMatch) current.id = idMatch[1].trim();
    if (locationMatch) current.location = locationMatch[1].trim();
    if (imageMatch) {
      current.images = imageMatch[1]
        .split(/\s*,\s*/)
        .map((url) => upgradeMarketplaceImage(marketplace, url.trim()))
        .filter(Boolean);
      current.image = current.images[0];
    }
  }
  flush();
  return listings;
}

const demoImages = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=82',
];

function createDemoListings(query: string, location: string, marketplaces: Marketplace[]): Listing[] {
  const normalized = query.toLowerCase();
  const catalogSeed = [
    ['Apple AirPods Pro 2nd Gen — excellent condition', 128],
    ['AirPods Pro with case, barely used', 95],
    ['Sony WH-1000XM5 noise-canceling headphones', 215],
    ['Nintendo Switch OLED white bundle', 238],
    ['Herman Miller Aeron Chair, size B', 625],
    ['Vintage walnut lounge chair', 180],
  ] as const;
  const queryProduct = normalized.trim()
    ? `${query.trim()} — gently used`
    : catalogSeed[0][0];
  const generatedPrice = normalized.includes('chair') ? 165 : normalized.includes('iphone') ? 585 : 145;
  const seeded = [[queryProduct, generatedPrice] as const, ...catalogSeed]
    .filter(([title], index, all) => all.findIndex(([other]) => other === title) === index)
    .slice(0, 6);

  return seeded.map(([title, price], index) => {
    const marketplace = marketplaces[index % marketplaces.length] || 'facebook';
    const id = `demo-${index + 1}`;
    return {
      id,
      title,
      price,
      priceLabel: `$${price.toLocaleString()}`,
      currency: 'USD',
      location: marketplace === 'facebook' ? `${location} · ${index + 2} mi` : 'Ships nationwide',
      image: demoImages[index % demoImages.length],
      images: [demoImages[index % demoImages.length]],
      url: '#demo-listing',
      marketplace,
      condition: index % 3 === 0 ? 'Like new' : index % 3 === 1 ? 'Good' : 'Pre-owned',
      retailMatch: findRetailMatch(title),
    };
  });
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    ebayConfigured: Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
    demoMode: process.env.DEMO_MODE === 'true',
  });
});

app.get('/api/image', async (request, response) => {
  try {
    const source = typeof request.query.url === 'string' ? request.query.url : '';
    const url = new URL(source);
    if (url.protocol !== 'https:' || !isAllowedImageHost(url.hostname)) {
      response.status(400).json({ message: 'Unsupported image source.' });
      return;
    }

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        Referer: url.hostname.includes('fbcdn') ? 'https://www.facebook.com/' : `${url.protocol}//${url.hostname}/`,
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*',
      },
      signal: AbortSignal.timeout(12_000),
    });
    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      response.status(502).json({ message: 'The marketplace image is unavailable.' });
      return;
    }

    const declaredSize = Number(upstream.headers.get('content-length') || 0);
    if (declaredSize > 10_000_000) {
      response.status(413).json({ message: 'The marketplace image is too large.' });
      return;
    }
    const image = Buffer.from(await upstream.arrayBuffer());
    if (image.byteLength > 10_000_000) {
      response.status(413).json({ message: 'The marketplace image is too large.' });
      return;
    }

    response.set({
      'Content-Type': contentType,
      'Content-Length': String(image.byteLength),
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    });
    response.send(image);
  } catch {
    response.status(502).json({ message: 'The marketplace image could not be loaded.' });
  }
});

app.post('/api/search', async (request, response) => {
  const query = typeof request.body?.query === 'string' ? request.body.query.trim().slice(0, 120) : '';
  const locationInput = typeof request.body?.location === 'string'
    ? request.body.location.trim().slice(0, 80) || 'Phoenix, AZ'
    : 'Phoenix, AZ';
  const location = canonicalizeLocation(locationInput);
  const requestedMarketplaces: unknown[] = Array.isArray(request.body?.marketplaces)
    ? request.body.marketplaces
    : ['facebook'];
  const selected = requestedMarketplaces.filter(
    (value): value is Marketplace =>
      value === 'facebook' || value === 'ebay' || value === 'depop' || value === 'poshmark',
  );
  const marketplaces = selected.length ? selected : ['facebook'] as Marketplace[];
  const minPrice = numberOrUndefined(request.body?.minPrice);
  const maxPrice = numberOrUndefined(request.body?.maxPrice);

  if (!query) {
    response.status(400).json({ message: 'Enter a product to search for.' });
    return;
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    response.status(400).json({ message: 'Minimum price cannot be higher than maximum price.' });
    return;
  }

  if (process.env.DEMO_MODE === 'true') {
    const payload: SearchResponse = {
      listings: createDemoListings(query, location, marketplaces),
      mode: 'demo',
      errors: [],
      searchedAt: new Date().toISOString(),
    };
    response.json(payload);
    return;
  }

  const outcomes = await Promise.all(marketplaces.map(async (marketplace) => {
    try {
      let text: string;
      try {
        text = await searchMarketplace({ query, marketplace, location, minPrice, maxPrice, limit: 12 });
      } catch (error) {
        if (marketplace !== 'facebook') throw error;
        await new Promise((resolve) => setTimeout(resolve, 450));
        text = await searchMarketplace({ query, marketplace, location, minPrice, maxPrice, limit: 12 });
      }
      if (/^(?:Unknown marketplace|❌)/m.test(text)) throw new Error(text.replace(/^[^:]+:\s*/, '').trim());
      return { marketplace, listings: parseMcpResults(text, marketplace) };
    } catch (error) {
      return { marketplace, listings: [], error: error instanceof Error ? error.message : String(error) };
    }
  }));

  const liveListings = outcomes.flatMap((outcome) => outcome.listings);
  const errors = outcomes
    .filter((outcome) => outcome.error)
    .map((outcome) => ({ marketplace: outcome.marketplace, message: outcome.error! }));
  const shouldFallBack = liveListings.length === 0 && errors.length > 0;
  const listings = shouldFallBack ? createDemoListings(query, location, marketplaces) : liveListings;
  const payload: SearchResponse = {
    listings,
    mode: shouldFallBack ? 'demo' : errors.length ? 'mixed' : 'live',
    errors,
    searchedAt: new Date().toISOString(),
  };
  response.json(payload);
});

app.post('/api/listing-photos', async (request, response) => {
  const listingId = typeof request.body?.listingId === 'string'
    ? request.body.listingId.trim().slice(0, 300)
    : '';
  const marketplace = request.body?.marketplace as Marketplace | undefined;
  const validMarketplace = marketplace === 'facebook' || marketplace === 'ebay' || marketplace === 'depop' || marketplace === 'poshmark';

  if (!listingId || !validMarketplace) {
    response.status(400).json({ message: 'A valid marketplace and listing ID are required.' });
    return;
  }

  if (listingId.startsWith('demo-')) {
    response.json({ images: [] });
    return;
  }

  try {
    const images = await getListingPhotos({ listingId, marketplace, maxImages: 10 });
    response.json({ images });
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Could not load listing photos.',
    });
  }
});

if (isProduction) {
  app.use(express.static(path.join(rootDir, 'dist')));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(rootDir, 'dist', 'index.html')));
} else {
  const vite = await createViteServer({
    root: rootDir,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Second Loop is ready at http://127.0.0.1:${port}`);
});
