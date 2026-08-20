export type Marketplace = 'facebook' | 'ebay' | 'depop' | 'poshmark';

export type RetailMatch = {
  id: string;
  name: string;
  originalPrice: number;
  confidence: number;
  matchType: 'exact' | 'likely';
};

export type Listing = {
  id: string;
  title: string;
  price: number;
  priceLabel: string;
  currency: string;
  location?: string;
  image?: string;
  images?: string[];
  url: string;
  marketplace: Marketplace;
  condition?: string;
  retailMatch: RetailMatch | null;
};

export type SearchResponse = {
  listings: Listing[];
  mode: 'live' | 'mixed' | 'demo';
  errors: { marketplace: Marketplace; message: string }[];
  searchedAt: string;
};

export type ComparisonState = {
  included: boolean;
  retailPrice?: number;
};
