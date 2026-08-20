import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  CircleAlert,
  Facebook,
  Heart,
  Info,
  Images,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type { ComparisonState, Listing, Marketplace, SearchResponse } from './types';

const starterListings: Listing[] = [
  {
    id: 'starter-1',
    title: 'Apple AirPods Pro 2nd Gen — excellent condition',
    price: 128,
    priceLabel: '$128',
    currency: 'USD',
    location: 'Phoenix · 3 mi',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82',
    url: '#demo-listing',
    marketplace: 'depop',
    condition: 'Like new',
    retailMatch: {
      id: 'airpods-pro-2',
      name: 'Apple AirPods Pro (2nd gen)',
      originalPrice: 249,
      confidence: 0.98,
      matchType: 'exact',
    },
  },
  {
    id: 'starter-2',
    title: 'Sony WH-1000XM5 noise-canceling headphones',
    price: 215,
    priceLabel: '$215',
    currency: 'USD',
    location: 'Ships nationwide',
    image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=82',
    url: '#demo-listing',
    marketplace: 'ebay',
    condition: 'Pre-owned',
    retailMatch: {
      id: 'sony-xm5',
      name: 'Sony WH-1000XM5',
      originalPrice: 399.99,
      confidence: 0.98,
      matchType: 'exact',
    },
  },
  {
    id: 'starter-3',
    title: 'Herman Miller Aeron Chair, size B',
    price: 625,
    priceLabel: '$625',
    currency: 'USD',
    location: 'Tempe · 8 mi',
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=82',
    url: '#demo-listing',
    marketplace: 'poshmark',
    condition: 'Good',
    retailMatch: {
      id: 'aeron-remastered',
      name: 'Herman Miller Aeron Chair',
      originalPrice: 1805,
      confidence: 0.98,
      matchType: 'exact',
    },
  },
  {
    id: 'starter-4',
    title: 'Vintage chrome desk lamp — fully working',
    price: 48,
    priceLabel: '$48',
    currency: 'USD',
    location: 'Scottsdale · 11 mi',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=82',
    url: '#demo-listing',
    marketplace: 'facebook',
    condition: 'Good',
    retailMatch: null,
  },
  {
    id: 'starter-5',
    title: 'Nintendo Switch OLED white bundle',
    price: 238,
    priceLabel: '$238',
    currency: 'USD',
    location: 'Ships nationwide',
    image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=900&q=82',
    url: '#demo-listing',
    marketplace: 'ebay',
    condition: 'Pre-owned',
    retailMatch: {
      id: 'switch-oled',
      name: 'Nintendo Switch OLED',
      originalPrice: 349.99,
      confidence: 0.97,
      matchType: 'exact',
    },
  },
  {
    id: 'starter-6',
    title: 'Walnut lounge chair, mid-century style',
    price: 180,
    priceLabel: '$180',
    currency: 'USD',
    location: 'Mesa · 14 mi',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=82',
    url: '#demo-listing',
    marketplace: 'facebook',
    condition: 'Good',
    retailMatch: null,
  },
];

const quickSearches = ['AirPods Pro 2', 'Aeron chair', 'Switch OLED', 'Dyson V15'];
const marketplaceOptions: { id: Marketplace; label: string; shortLabel: string }[] = [
  { id: 'facebook', label: 'Facebook Marketplace', shortLabel: 'Facebook' },
  { id: 'ebay', label: 'eBay', shortLabel: 'eBay' },
  { id: 'depop', label: 'Depop', shortLabel: 'Depop' },
  { id: 'poshmark', label: 'Poshmark', shortLabel: 'Poshmark' },
];

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function sourceName(marketplace: Marketplace) {
  return marketplaceOptions.find((option) => option.id === marketplace)?.label ?? marketplace;
}

function sourceShortName(marketplace: Marketplace) {
  return marketplaceOptions.find((option) => option.id === marketplace)?.shortLabel ?? marketplace;
}

function listingKey(listing: Listing) {
  return `${listing.marketplace}:${listing.id}`;
}

function uniquePhotoUrls(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((url) => {
    let key = url;
    try {
      const parsed = new URL(url);
      key = parsed.pathname.split('/').pop() || parsed.pathname;
    } catch {
      // Keep the complete value as the identity for non-standard URLs.
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function displayPhotoUrl(url: string | undefined, isDemo: boolean) {
  if (!url || isDemo || !url.startsWith('https://')) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function MarketplaceGlyph({ marketplace }: { marketplace: Marketplace }) {
  if (marketplace === 'facebook') return <Facebook size={14} />;
  if (marketplace === 'ebay') return <span className="marketplace-letter ebay-letter">e</span>;
  if (marketplace === 'depop') return <span className="marketplace-letter depop-letter">D</span>;
  return <span className="marketplace-letter poshmark-letter">P</span>;
}

function initialComparison(listing: Listing): ComparisonState {
  return {
    included: Boolean(listing.retailMatch && listing.retailMatch.confidence >= 0.9),
    retailPrice: listing.retailMatch?.originalPrice,
  };
}

function ProductCard({
  listing,
  comparison,
  saved,
  onToggleComparison,
  onSetRetailPrice,
  onToggleSaved,
  onDemoLink,
  onNotice,
}: {
  listing: Listing;
  comparison: ComparisonState;
  saved: boolean;
  onToggleComparison: () => void;
  onSetRetailPrice: (price?: number) => void;
  onToggleSaved: () => void;
  onDemoLink: () => void;
  onNotice: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState(comparison.retailPrice?.toString() ?? '');
  const [photos, setPhotos] = useState<string[]>(() => uniquePhotoUrls([
    ...(listing.images || []),
    ...(listing.image ? [listing.image] : []),
  ]));
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const currentPhoto = photos[photoIndex];
  const savings = comparison.included && comparison.retailPrice && comparison.retailPrice > 0
    ? Math.round((1 - listing.price / comparison.retailPrice) * 100)
    : null;
  const matchLabel = listing.retailMatch?.matchType === 'exact'
    ? '1:1 product match'
    : listing.retailMatch
      ? 'Possible product match'
      : 'No retail match';

  const savePrice = () => {
    const value = Number(draftPrice);
    if (Number.isFinite(value) && value > 0) {
      onSetRetailPrice(value);
      setEditing(false);
    }
  };

  const loadPhotos = async () => {
    if (photosLoaded || loadingPhotos || listing.url.startsWith('#')) return;
    setLoadingPhotos(true);
    try {
      const response = await fetch('/api/listing-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, marketplace: listing.marketplace }),
      });
      const data = await response.json() as { images?: string[]; message?: string };
      if (!response.ok) throw new Error(data.message || 'Could not load listing photos.');
      const merged = uniquePhotoUrls([...(data.images || []), ...photos]);
      setPhotos(merged);
      setPhotoIndex(0);
      setImageFailed(false);
      setPhotosLoaded(true);
      if (merged.length <= 1) onNotice('This listing only has one available photo.');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not load listing photos.');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const movePhoto = (direction: number) => {
    setImageFailed(false);
    setPhotoIndex((current) => (current + direction + photos.length) % photos.length);
  };

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        {currentPhoto && !imageFailed ? (
          <img
            className="product-image"
            src={displayPhotoUrl(currentPhoto, listing.url.startsWith('#'))}
            alt={`${listing.title}, photo ${photoIndex + 1} of ${photos.length}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="image-fallback" aria-hidden="true">
            <span>{listing.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <span className={`source-badge ${listing.marketplace}`}>
          <MarketplaceGlyph marketplace={listing.marketplace} />
          {sourceShortName(listing.marketplace)}
        </span>
        <button
          className={`save-button ${saved ? 'saved' : ''}`}
          type="button"
          onClick={onToggleSaved}
          aria-label={saved ? 'Remove from saved items' : 'Save item'}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {photos.length > 1 && (
          <div className="photo-nav" aria-label="Listing photos">
            <button type="button" onClick={() => movePhoto(-1)} aria-label="Previous photo">
              <ChevronDown size={19} />
            </button>
            <button type="button" onClick={() => movePhoto(1)} aria-label="Next photo">
              <ChevronDown size={19} />
            </button>
          </div>
        )}
        {!listing.url.startsWith('#') && (
          photosLoaded ? (
            <span className="photo-count">
              <Images size={14} /> {photos.length ? `${photoIndex + 1} / ${photos.length}` : 'No photos'}
            </span>
          ) : (
            <button className="photo-load" type="button" onClick={loadPhotos} disabled={loadingPhotos}>
              {loadingPhotos ? <span className="photo-spinner" /> : <Images size={14} />}
              {loadingPhotos ? 'Loading' : 'All photos'}
            </button>
          )
        )}
      </div>

      <div className="product-body">
        <div className="product-meta">
          <span>{listing.condition || 'Pre-owned'}</span>
          <span className="meta-dot" />
          <span>{listing.location || 'Location unavailable'}</span>
        </div>
        <h3>{listing.title}</h3>
        <div className="price-line">
          <strong>{listing.priceLabel}</strong>
          <span>asking price</span>
        </div>

        <div className={`value-panel ${comparison.included ? 'included' : 'excluded'}`}>
          <div className="value-heading">
            <div>
              <span className="match-label">
                {listing.retailMatch?.matchType === 'exact' && <Check size={12} strokeWidth={3} />}
                {matchLabel}
              </span>
              {comparison.included && comparison.retailPrice ? (
                <p>
                  Retail <strong>{money(comparison.retailPrice, listing.currency)}</strong>
                  {savings !== null && <span className={savings >= 0 ? 'save-positive' : 'save-negative'}>{savings >= 0 ? `Save ${savings}%` : `${Math.abs(savings)}% over retail`}</span>}
                </p>
              ) : (
                <p>Excluded from value summary</p>
              )}
            </div>
            <button
              type="button"
              className={`mini-toggle ${comparison.included ? 'on' : ''}`}
              onClick={() => {
                if (comparison.retailPrice) onToggleComparison();
                else setEditing(true);
              }}
              aria-pressed={comparison.included}
              aria-label={comparison.included ? 'Exclude from price comparison' : 'Include in price comparison'}
            >
              <span />
            </button>
          </div>

          {editing ? (
            <div className="retail-editor">
              <label>
                Original retail price
                <span className="money-input">
                  <span>$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={draftPrice}
                    onChange={(event) => setDraftPrice(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') savePrice();
                      if (event.key === 'Escape') setEditing(false);
                    }}
                    aria-label="Original retail price"
                  />
                </span>
              </label>
              <button type="button" onClick={savePrice}>Save</button>
              <button type="button" className="icon-cancel" onClick={() => setEditing(false)} aria-label="Cancel">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="edit-retail"
              onClick={() => {
                setDraftPrice(comparison.retailPrice?.toString() ?? '');
                setEditing(true);
              }}
            >
              {comparison.retailPrice ? 'Edit retail price' : 'Add retail price'}
            </button>
          )}
        </div>

        <a
          className="listing-link"
          href={listing.url}
          target={listing.url.startsWith('#') ? undefined : '_blank'}
          rel="noreferrer"
          onClick={(event) => {
            if (listing.url.startsWith('#')) {
              event.preventDefault();
              onDemoLink();
            }
          }}
        >
          View listing <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Phoenix, AZ');
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>(['facebook', 'depop', 'poshmark']);
  const [ebayConfigured, setEbayConfigured] = useState(false);
  const [activeResultSource, setActiveResultSource] = useState<'all' | Marketplace>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<'value' | 'low' | 'high'>('value');
  const [listings, setListings] = useState<Listing[]>(starterListings);
  const [comparison, setComparison] = useState<Record<string, ComparisonState>>(() =>
    Object.fromEntries(starterListings.map((listing) => [listingKey(listing), initialComparison(listing)])),
  );
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'preview' | SearchResponse['mode']>('preview');
  const [errors, setErrors] = useState<SearchResponse['errors']>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('Curated picks');
  const [notice, setNotice] = useState<string | null>(null);
  const [compactSearchVisible, setCompactSearchVisible] = useState(false);
  const [compactSourcesOpen, setCompactSourcesOpen] = useState(false);
  const primarySearchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((response) => response.json())
      .then((health: { ebayConfigured?: boolean }) => {
        if (!active || !health.ebayConfigured) return;
        setEbayConfigured(true);
        setMarketplaces((current) => current.includes('ebay') ? current : [...current, 'ebay']);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const searchForm = primarySearchRef.current;
    if (!searchForm) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCompactSearchVisible(!entry.isIntersecting && window.scrollY > 300);
        if (entry.isIntersecting) setCompactSourcesOpen(false);
      },
      { threshold: 0.08 },
    );
    observer.observe(searchForm);
    return () => observer.disconnect();
  }, []);

  const visibleListings = useMemo(
    () => activeResultSource === 'all'
      ? listings
      : listings.filter((listing) => listing.marketplace === activeResultSource),
    [activeResultSource, listings],
  );

  const sortedListings = useMemo(() => {
    return [...visibleListings].sort((a, b) => {
      if (sort === 'low') return a.price - b.price;
      if (sort === 'high') return b.price - a.price;
      const aState = comparison[listingKey(a)] || initialComparison(a);
      const bState = comparison[listingKey(b)] || initialComparison(b);
      const aSavings = aState.included && aState.retailPrice ? 1 - a.price / aState.retailPrice : -Infinity;
      const bSavings = bState.included && bState.retailPrice ? 1 - b.price / bState.retailPrice : -Infinity;
      return bSavings - aSavings;
    });
  }, [visibleListings, comparison, sort]);

  const summary = useMemo(() => {
    const included = visibleListings
      .map((listing) => ({ listing, state: comparison[listingKey(listing)] || initialComparison(listing) }))
      .filter(({ state }) => state.included && state.retailPrice && state.retailPrice > 0);
    const savings = included.map(({ listing, state }) => Math.round((1 - listing.price / state.retailPrice!) * 100));
    return {
      compared: included.length,
      average: savings.length ? Math.round(savings.reduce((total, value) => total + value, 0) / savings.length) : 0,
      best: savings.length ? Math.max(...savings) : 0,
    };
  }, [visibleListings, comparison]);

  const toggleMarketplace = (marketplace: Marketplace) => {
    setMarketplaces((current) => {
      if (current.includes(marketplace)) {
        return current.length === 1 ? current : current.filter((item) => item !== marketplace);
      }
      return [...current, marketplace];
    });
  };

  const runSearch = async (event?: FormEvent, overrideQuery?: string) => {
    event?.preventDefault();
    const searchQuery = (overrideQuery ?? query).trim();
    if (!searchQuery) {
      setNotice('Type a product name to start searching.');
      return;
    }
    if (overrideQuery) setQuery(overrideQuery);
    setCompactSourcesOpen(false);
    setLoading(true);
    setErrors([]);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, location, marketplaces, minPrice, maxPrice }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Search failed.');
      const result = data as SearchResponse;
      setListings(result.listings);
      setComparison(Object.fromEntries(result.listings.map((listing) => [listingKey(listing), initialComparison(listing)])));
      setMode(result.mode);
      setErrors(result.errors);
      setLastQuery(searchQuery);
      setActiveResultSource('all');
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateComparison = (listing: Listing, updater: (current: ComparisonState) => ComparisonState) => {
    const key = listingKey(listing);
    setComparison((current) => ({
      ...current,
      [key]: updater(current[key] || initialComparison(listing)),
    }));
  };

  return (
    <div className="app-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Second Loop home">
          <span className="brand-mark"><ArrowDown size={17} /></span>
          <span>SECOND<br />LOOP</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#results">Browse</a>
          <a href="#value-guide">How value works</a>
        </nav>
        <button type="button" className="saved-nav" onClick={() => setNotice(`${saved.size} item${saved.size === 1 ? '' : 's'} saved for later.`)}>
          <Bookmark size={17} />
          Saved <span>{saved.size}</span>
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={14} /> Search smarter. Buy secondhand.</p>
            <h1>Know the value<br />before you <em>buy.</em></h1>
            <p className="hero-subtitle">
              One search across local resale. We match recognizable products to their original retail price—only when the match makes sense.
            </p>
          </div>
          <div className="hero-stamp" aria-hidden="true">
            <span>AVG. CURATED SAVINGS</span>
            <strong>48%</strong>
            <small>less than retail</small>
          </div>
        </section>

        <section className="search-stage" aria-label="Product search">
          <form ref={primarySearchRef} className="search-bar" onSubmit={(event) => runSearch(event)}>
            <Search size={23} />
            <label>
              <span className="sr-only">Product to search for</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you looking for?"
                autoComplete="off"
              />
            </label>
            <div className="location-field">
              <MapPin size={17} />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                aria-label="Search location"
              />
            </div>
            <button className="search-submit" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Search'}
            </button>
          </form>
          <div className="marketplace-picker" aria-label="Marketplaces to search">
            <span>Search in</span>
            <div>
              {marketplaceOptions.map((option) => {
                const selected = marketplaces.includes(option.id);
                const disabled = option.id === 'ebay' && !ebayConfigured;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`marketplace-pill ${option.id} ${selected ? 'selected' : ''}`}
                    aria-pressed={selected}
                    disabled={disabled}
                    title={disabled ? 'Add eBay API credentials in .env to enable this source' : undefined}
                    onClick={() => toggleMarketplace(option.id)}
                  >
                    <span className="marketplace-pill-icon"><MarketplaceGlyph marketplace={option.id} /></span>
                    {option.shortLabel}
                    {disabled && <small>API key</small>}
                    {selected && <Check size={13} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="search-underbar">
            <div className="quick-searches">
              <span>Try</span>
              {quickSearches.map((item) => (
                <button key={item} type="button" onClick={() => runSearch(undefined, item)}>{item}</button>
              ))}
            </div>
            <button type="button" className="filter-trigger" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}>
              <SlidersHorizontal size={15} /> Filters <ChevronDown size={14} className={showFilters ? 'rotated' : ''} />
            </button>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <fieldset>
                <legend>Asking price</legend>
                <div className="price-inputs">
                  <label><span>Min</span><div><b>$</b><input inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" /></div></label>
                  <span>—</span>
                  <label><span>Max</span><div><b>$</b><input inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" /></div></label>
                </div>
              </fieldset>
              <div className="filter-note"><Info size={15} /> eBay requires API credentials. Depop and Poshmark launch a headless browser and may take a few seconds longer.</div>
            </div>
          )}
        </section>

        <section className="value-guide" id="value-guide">
          <div className="guide-title">
            <span>THE VALUE CHECK</span>
            <h2>Comparable—not<br /><em>questionable.</em></h2>
          </div>
          <ol>
            <li><span>01</span><div><h3>We find the listing</h3><p>Facebook Marketplace, eBay, Depop, and Poshmark results arrive through one MCP connection.</p></div></li>
            <li><span>02</span><div><h3>We check the identity</h3><p>Brand and model words are matched to a small, transparent retail catalog.</p></div></li>
            <li><span>03</span><div><h3>You make the call</h3><p>Opt out of any comparison, or replace the retail price with one you trust.</p></div></li>
          </ol>
        </section>

        <section className="results-section" id="results">
          <div className="results-topline">
            <div>
              <div className="mode-line">
                <span className={`status-dot ${mode}`} />
                {mode === 'live' ? 'Live MCP results' : mode === 'mixed' ? 'Live results · some sources unavailable' : mode === 'demo' ? 'Sample results · live sources unavailable' : 'Curated preview'}
              </div>
              <h2>{lastQuery}</h2>
              <p>{visibleListings.length}{activeResultSource === 'all' ? '' : ` ${sourceShortName(activeResultSource)}`} listings around {location}</p>
            </div>
            <label className="sort-control">
              <span>Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="value">Best value</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          {errors.length > 0 && (
            <div className="source-warning">
              <CircleAlert size={17} />
              <p>
                {errors.map((error) => sourceName(error.marketplace)).join(' and ')} could not return live results.
                {mode === 'demo' ? ' We kept the experience usable with sample listings.' : ' Results from the remaining source are shown.'}
              </p>
            </div>
          )}

          <div className="result-source-tabs" role="tablist" aria-label="Filter results by marketplace">
            <button
              type="button"
              role="tab"
              aria-selected={activeResultSource === 'all'}
              className={activeResultSource === 'all' ? 'active' : ''}
              onClick={() => setActiveResultSource('all')}
            >
              All <span>{listings.length}</span>
            </button>
            {marketplaceOptions.map((option) => {
              const count = listings.filter((listing) => listing.marketplace === option.id).length;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={activeResultSource === option.id}
                  className={activeResultSource === option.id ? 'active' : ''}
                  onClick={() => setActiveResultSource(option.id)}
                >
                  <MarketplaceGlyph marketplace={option.id} />
                  {option.shortLabel} <span>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="summary-strip">
            <div><span>Listings shown</span><strong>{visibleListings.length.toString().padStart(2, '0')}</strong></div>
            <div><span>Compared by you</span><strong>{summary.compared.toString().padStart(2, '0')}</strong></div>
            <div><span>Average savings</span><strong>{summary.compared ? `${summary.average}%` : '—'}</strong></div>
            <div className="best-stat"><Tag size={20} /><span>Best value</span><strong>{summary.compared ? `${summary.best}% off` : 'Add a retail price'}</strong></div>
          </div>

          {loading ? (
            <div className="loading-grid" aria-label="Searching listings">
              {Array.from({ length: 6 }).map((_, index) => <div className="loading-card" key={index}><div /><span /><span /></div>)}
            </div>
          ) : visibleListings.length ? (
            <div className="product-grid">
              {sortedListings.map((listing) => (
                <ProductCard
                  key={`${listing.marketplace}-${listing.id}`}
                  listing={listing}
                  comparison={comparison[listingKey(listing)] || initialComparison(listing)}
                  saved={saved.has(listingKey(listing))}
                  onToggleComparison={() => updateComparison(listing, (current) => ({
                    ...current,
                    included: current.retailPrice ? !current.included : false,
                  }))}
                  onSetRetailPrice={(price) => updateComparison(listing, () => ({ included: Boolean(price), retailPrice: price }))}
                  onToggleSaved={() => setSaved((current) => {
                    const next = new Set(current);
                    const key = listingKey(listing);
                    if (next.has(key)) next.delete(key); else next.add(key);
                    return next;
                  })}
                  onDemoLink={() => setNotice('This is a sample listing. Run a search to open live marketplace links.')}
                  onNotice={setNotice}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={26} />
              <h3>No listings found</h3>
              <p>Try a broader product name, a nearby city, or remove the price limit.</p>
            </div>
          )}
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><ArrowDown size={17} /></span><span>SECOND<br />LOOP</span></a>
        <p>Secondhand prices, with context.</p>
        <span>Powered by Secondhand MCP</span>
      </footer>

      {compactSearchVisible && (
        <aside className="compact-search" aria-label="Quick search">
          {compactSourcesOpen && (
            <div className="compact-source-menu">
              <div>
                <strong>Search marketplaces</strong>
                <button type="button" onClick={() => setCompactSourcesOpen(false)} aria-label="Close marketplace menu">
                  <X size={15} />
                </button>
              </div>
              {marketplaceOptions.map((option) => {
                const selected = marketplaces.includes(option.id);
                const disabled = option.id === 'ebay' && !ebayConfigured;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={selected ? 'selected' : ''}
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => toggleMarketplace(option.id)}
                  >
                    <span><MarketplaceGlyph marketplace={option.id} /></span>
                    {option.shortLabel}
                    {disabled ? <small>API key</small> : selected && <Check size={14} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          )}
          <form onSubmit={(event) => runSearch(event)}>
            <Search size={18} />
            <label>
              <span className="sr-only">Change product search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Change your search…"
                aria-label="Change product search"
              />
            </label>
            <button
              type="button"
              className="compact-source-trigger"
              onClick={() => setCompactSourcesOpen((value) => !value)}
              aria-expanded={compactSourcesOpen}
            >
              {marketplaces.length} source{marketplaces.length === 1 ? '' : 's'}
              <ChevronDown size={13} />
            </button>
            <button type="submit" className="compact-submit" disabled={loading} aria-label="Run new search">
              {loading ? <span className="photo-spinner" /> : <ArrowUpRight size={18} />}
            </button>
          </form>
        </aside>
      )}

      {notice && <div className={`toast ${compactSearchVisible ? 'above-dock' : ''}`} role="status">{notice}</div>}
    </div>
  );
}
