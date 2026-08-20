import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Marketplace } from '../src/types.js';

type McpContent = { type: string; text?: string };

let clientPromise: Promise<Client> | null = null;

function mcpTimeoutMs() {
  const value = Number(process.env.SECONDHAND_MCP_TIMEOUT_MS ?? 30_000);
  return Number.isFinite(value) ? value : 30_000;
}

async function connectClient(): Promise<Client> {
  const command = process.env.SECONDHAND_MCP_COMMAND || 'npx';
  const packageName = process.env.SECONDHAND_MCP_PACKAGE || 'secondhand-mcp@0.5.0';
  const args = process.env.SECONDHAND_MCP_ARGS
    ? JSON.parse(process.env.SECONDHAND_MCP_ARGS) as string[]
    : ['-y', packageName];

  const transport = new StdioClientTransport({
    command,
    args,
    env: {
      ...process.env,
      MARKETPLACES: 'facebook,ebay,depop,poshmark',
    } as Record<string, string>,
    stderr: 'pipe',
  });

  const client = new Client({ name: 'second-loop-web', version: '0.1.0' });
  await client.connect(transport);
  return client;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = connectClient().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Search timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function searchMarketplace(args: {
  query: string;
  marketplace: Marketplace;
  location: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  const client = await getClient();
  const result = await withTimeout(
    client.callTool({
      name: 'search_marketplace',
      arguments: {
        query: args.query,
        marketplace: args.marketplace,
        location: args.location,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        limit: args.limit ?? 12,
        includeImages: true,
      },
    }),
    mcpTimeoutMs(),
  );

  const text = (result.content as McpContent[])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n');

  if (result.isError) throw new Error(text || 'The marketplace returned an error.');
  return text;
}

export async function getListingPhotos(args: {
  listingId: string;
  marketplace: Marketplace;
  maxImages?: number;
}) {
  const client = await getClient();
  const result = await withTimeout(
    client.callTool({
      name: 'get_listing_details',
      arguments: {
        listingId: args.listingId,
        marketplace: args.marketplace,
        imageMode: 'urls',
        imageSize: 'standard',
        maxImages: args.maxImages ?? 10,
      },
    }),
    mcpTimeoutMs(),
  );

  const text = (result.content as McpContent[])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n');

  if (result.isError) throw new Error(text || 'Could not load listing photos.');

  const images = Array.from(text.matchAll(/!\[Photo\s+\d+\]\((https?:\/\/[^)]+)\)/g), (match) => match[1]);
  return [...new Set(images)];
}
