import type { HeroContent, OrderResponse, Product } from './types';
import { graphqlEndpoint as endpoint } from './api';

async function gql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!response.ok) throw new Error(`API unavailable (HTTP ${response.status})`);
  const result: { data?: T; errors?: { message: string }[] } = await response.json();
  if (result.errors?.length) throw new Error(result.errors[0].message);
  if (!result.data) throw new Error('No data returned from GraphQL server.');
  return result.data;
}

const catalogQuery = `
  query Catalog($search: String, $category: String, $inStockOnly: Boolean) {
    products(search: $search, category: $category, inStockOnly: $inStockOnly) {
      id sku name category description price stock symbol featured
    }
    categories
    hero { heading body }
  }
`;

export async function fetchCatalog(search: string, category: string, inStockOnly: boolean, signal?: AbortSignal) {
  return gql<{ products: Product[]; categories: string[]; hero: HeroContent | null }>(
    catalogQuery, { search, category, inStockOnly }, signal
  );
}

const orderMutation = `
  mutation PlaceOrder($email: String!, $items: [OrderItemInput!]!) {
    placeOrder(email: $email, items: $items) { id email total createdAtUtc }
  }
`;

export async function placeOrder(email: string, items: { productId: number; quantity: number }[]) {
  const result = await gql<{ placeOrder: OrderResponse }>(orderMutation, { email, items });
  return result.placeOrder;
}
