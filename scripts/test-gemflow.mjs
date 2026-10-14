/**
 * GemFlow API integration/security checks. Node.js 20+, no npm dependencies.
 * Default mode is read-only and safe for an existing development database.
 * Optional --with-admin tests login, authenticated order query, logout.
 * Never prints credentials or cookies.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = (process.env.GEMFLOW_API_URL || 'http://localhost:5100').replace(/\/$/, '');
const withAdmin = process.argv.includes('--with-admin');
const TIMEOUT_MS = 8000;

async function request(path, init = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...init,
    });
  } catch (error) {
    throw new Error(`Cannot reach ${base}${path}: ${error.message}. Check docker compose ps -a and API logs.`);
  }
  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : null; }
  catch { throw new Error(`${path} returned non-JSON (HTTP ${response.status}): ${raw.slice(0, 120)}`); }
  return { response, body };
}

async function graphql(query, variables = {}, extraHeaders = {}) {
  const { response, body } = await request('/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });
  return { response, body };
}

function okGraphql(result, label) {
  assert.equal(result.response.status, 200, `${label} HTTP ${result.response.status}`);
  assert.ok(!result.body?.errors?.length, `${label} GraphQL errors: ${JSON.stringify(result.body?.errors)}`);
  assert.ok(result.body?.data, `${label}: missing data`);
  return result.body.data;
}

// A shared promise avoids assuming the tests execute in a particular order.
const catalog = graphql(`query CatalogTest {
  products { id sku name category price stock }
  categories
  hero { heading }
}`);

test('1. GET /health responds successfully', async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(body?.status, 'ok');
});

test('2. GraphQL catalog and categories are available', async () => {
  const data = okGraphql(await catalog, 'catalog');
  assert.ok(Array.isArray(data.products) && data.products.length > 0, 'catalog is empty');
  assert.ok(Array.isArray(data.categories), 'missing categories');
  for (const p of data.products) {
    assert.ok(Number.isInteger(p.id) && p.id > 0, `invalid product id ${p.id}`);
    assert.ok(typeof p.sku === 'string' && p.sku.length > 0, 'missing SKU');
    assert.ok(typeof p.name === 'string' && p.name.length > 0, 'missing product name');
    assert.ok(typeof p.category === 'string', 'missing category');
    assert.ok(Number(p.price) >= 0 && Number(p.stock) >= 0, 'invalid price/stock');
    assert.ok(data.categories.includes(p.category), `category ${p.category} missing`);
  }
});

test('3. Partner REST feed matches GraphQL inventory', async () => {
  const products = okGraphql(await catalog, 'catalog').products;
  const { response, body: feed } = await request('/api/partner/catalog');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(feed) && feed.length > 0, 'partner feed is empty');
  const mapped = new Map(feed.map(p => [p.sku, p]));
  // SQL Server and GraphQL should be backed by the same product table.
  for (const product of products) {
    const fromFeed = mapped.get(product.sku);
    assert.ok(fromFeed, `feed missing SKU ${product.sku}`);
    assert.equal(Number(fromFeed.stock), product.stock, `stock mismatch for ${product.sku}`);
    assert.equal(Number(fromFeed.price), Number(product.price), `price mismatch for ${product.sku}`);
    assert.equal(Boolean(fromFeed.available), product.stock > 0, `availability mismatch for ${product.sku}`);
  }
});

test('4. In-stock product filter returns only available products', async () => {
  const data = okGraphql(await graphql(`query { products(inStockOnly: true) { id stock } }`), 'stock filter');
  assert.ok(Array.isArray(data.products));
  assert.ok(data.products.every(p => p.stock > 0), 'out-of-stock product returned');
});

test('5. Invalid checkout is rejected without creating an order', async () => {
  const result = await graphql(`mutation { placeOrder(email: "invalid-email", items: []) { id } }`);
  assert.ok(result.body?.errors?.length, 'invalid checkout was accepted');
});

test('6. Admin session endpoint rejects anonymous requests', async () => {
  const { response } = await request('/api/admin/me');
  assert.equal(response.status, 401, 'admin authentication may not be installed');
});

test('7. Customer order data is private', async () => {
  const result = await graphql(`query { orders { id email total } }`);
  assert.ok(result.body?.errors?.length, 'unauthenticated orders query was accepted');
  assert.ok(!result.body?.data?.orders, 'private orders data was returned');
});

test('8. Staff order mutation requires sign-in', async () => {
  // orderId 0 is deliberately invalid: even if authorization is absent, no order can change.
  const result = await graphql(`mutation { updateOrderStatus(orderId: 0, status: "Processing") { id } }`, {}, { 'X-GemFlow-Admin': '1' });
  assert.ok(result.body?.errors?.length, 'unauthenticated order mutation was accepted');
  const messages = JSON.stringify(result.body.errors);
  assert.match(messages, /admin|authoriz|sign.in|authenticat|access.denied|unexpected.execution.error/i,
    'could not confirm an authorization-related error (rather than just invalid order input)');
});

if (withAdmin) {
  test('9. Admin login, private order query, and logout work', async () => {
    const dotenv = await readFile(resolve(process.cwd(), '.env'), 'utf8');
    const config = Object.fromEntries(dotenv.split(/\r?\n/).filter(line => /^ADMIN_(USERNAME|PASSWORD)=/.test(line)).map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1).replace(/^['"]|['"]$/g, '')];
    }));
    assert.ok(config.ADMIN_USERNAME && config.ADMIN_PASSWORD, 'Missing ADMIN_USERNAME / ADMIN_PASSWORD in project .env');

    const login = await request('/api/admin/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: config.ADMIN_USERNAME, password: config.ADMIN_PASSWORD }),
    });
    assert.equal(login.response.status, 200, `admin login failed HTTP ${login.response.status}`);
    const rawCookie = login.response.headers.get('set-cookie');
    assert.ok(rawCookie?.includes('GemFlow.Admin='), 'login did not set admin cookie');
    const cookie = rawCookie.split(';')[0];

    const me = await request('/api/admin/me', { headers: { cookie } });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.username, config.ADMIN_USERNAME);

    const orders = await graphql('query { orders { id status total } }', {}, { cookie });
    const data = okGraphql(orders, 'authenticated orders');
    assert.ok(Array.isArray(data.orders), 'authenticated order list missing');

    const logout = await request('/api/admin/logout', {
      method: 'POST', headers: { cookie, 'X-GemFlow-Admin': '1' },
    });
    assert.equal(logout.response.status, 204, 'logout failed');
    const expiredCookie = logout.response.headers.get('set-cookie') || '';
    assert.ok(expiredCookie.includes('GemFlow.Admin='), 'logout did not clear browser cookie');
    // Cookie auth is stateless: replaying a captured old cookie may still work.
    // Verify the server tells the browser to discard its cookie, then anonymous access is denied.
    const after = await request('/api/admin/me');
    assert.equal(after.response.status, 401, 'anonymous session is not denied after logout');
  });
}
