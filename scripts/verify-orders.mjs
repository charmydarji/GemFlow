// Read-only integration test: doesn't place orders or change statuses.
// Run from your project root: node scripts/verify-orders.mjs
const endpoint = process.env.GEMFLOW_GRAPHQL_URL ?? 'http://localhost:5100/graphql';
const query = `query VerifyOrders { orders {
  id email status total createdAtUtc
  lines { id sku productName quantity unitPrice }
} }`;

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length || !Array.isArray(result.data?.orders)) {
    throw new Error(JSON.stringify(result.errors ?? result, null, 2));
  }
  const orders = result.data.orders;
  console.log(`✓ GraphQL orders query succeeded (HTTP ${response.status})`);
  console.log(`✓ Returned ${orders.length} recent order(s).`);
  if (orders[0]) console.log(`✓ Latest order #${orders[0].id}: ${orders[0].status}, ${orders[0].lines.length} line(s)`);
  else console.log('No orders yet. Place a demo order in the storefront to test the dashboard.');
} catch (error) {
  console.error('✗ Could not query orders:', error.message);
  process.exitCode = 1;
}
