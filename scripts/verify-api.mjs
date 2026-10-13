// JavaScript smoke test: node scripts/verify-api.mjs
const base = process.env.GEMFLOW_API_URL ?? 'http://localhost:5100';
async function assertOk(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}
try {
  const health = await assertOk(`${base}/health`);
  const result = await assertOk(`${base}/graphql`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ products { id name sku stock price } categories hero { heading } }' }),
  });
  if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  if (!result.data?.products?.length) throw new Error('Catalog is empty');
  const feed = await assertOk(`${base}/api/partner/catalog`);
  if (!feed.length) throw new Error('Partner feed is empty');
  console.log('✓', health.status, '|', result.data.products.length, 'GraphQL products |', feed.length, 'partner feed products');
} catch (error) {
  console.error('✗', error.message);
  process.exitCode = 1;
}
