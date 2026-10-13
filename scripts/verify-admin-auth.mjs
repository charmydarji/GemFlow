// Run AFTER deploying admin auth. Tests public catalog + forbidden unauthenticated staff actions.
const root = process.env.API_URL || 'http://localhost:5100';
const gql = async (query, variables = {}) => {
  const response = await fetch(`${root}/graphql`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GemFlow-Admin': '1' },
    body: JSON.stringify({ query, variables }),
  });
  return { status: response.status, body: await response.json() };
};
const catalog = await gql('query { products { id sku } }');
if (catalog.body.errors || !Array.isArray(catalog.body.data?.products)) throw new Error('Public catalog query failed.');
console.log('PASS: public catalog is accessible without a login.');
const me = await fetch(`${root}/api/admin/me`);
if (me.status !== 401) throw new Error(`/api/admin/me expected HTTP 401, got ${me.status}`);
console.log('PASS: unauthenticated admin session is denied (401).');
const orders = await gql('query { orders { id email } }');
if (!orders.body.errors?.length || orders.body.data?.orders) throw new Error('Unauthenticated orders query was not blocked.');
console.log('PASS: private order data is protected.');
const mutation = await gql(`mutation {
  createProduct(sku:"NO-AUTH-TEST",name:"Blocked",category:"Rings",description:"",price:1,stock:1) { id }
}`);
if (!mutation.body.errors?.length || mutation.body.data?.createProduct) throw new Error('Unauthenticated createProduct was not blocked.');
console.log('PASS: unauthenticated product mutation was blocked.');
console.log('Authentication smoke checks passed. No products were created.');
