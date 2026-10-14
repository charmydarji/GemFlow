import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchCatalog } from './gql';
import { graphqlEndpoint as endpoint } from './api';
import type { Product } from './types';

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD',
}).format(value);

const initialForm = {
  sku: '',
  name: '',
  category: 'Rings',
  description: '',
  price: '',
  stock: '0',
};

type ProductForm = typeof initialForm;

type CreateProductResponse = {
  data?: { createProduct: Product };
  errors?: Array<{ message: string }>;
};

async function createProduct(input: {
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
}): Promise<Product> {
  const query = `
    mutation CreateProduct(
      $sku: String!, $name: String!, $category: String!,
      $description: String!, $price: Decimal!, $stock: Int!
    ) {
      createProduct(
        sku: $sku, name: $name, category: $category,
        description: $description, price: $price, stock: $stock
      ) { id sku name category description price stock symbol featured }
    }
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GemFlow-Admin': '1' },
    credentials: 'include',
    body: JSON.stringify({ query, variables: input }),
  });
  if (!response.ok) throw new Error(`GraphQL request failed (HTTP ${response.status}).`);
  const result = await response.json() as CreateProductResponse;
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join(' '));
  if (!result.data?.createProduct) throw new Error('The API did not return a new product.');
  return result.data.createProduct;
}


type UpdateProductResponse = {
  data?: { updateProduct: Product };
  errors?: Array<{ message: string }>;
};

async function updateProduct(input: {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
}): Promise<Product> {
  const query = `
    mutation UpdateProduct(
      $id: Int!, $name: String!, $category: String!,
      $description: String!, $price: Decimal!, $stock: Int!
    ) {
      updateProduct(
        id: $id, name: $name, category: $category,
        description: $description, price: $price, stock: $stock
      ) { id sku name category description price stock symbol featured }
    }
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GemFlow-Admin': '1' },
    credentials: 'include',
    body: JSON.stringify({ query, variables: input }),
  });
  if (!response.ok) throw new Error(`GraphQL request failed (HTTP ${response.status}).`);
  const result = await response.json() as UpdateProductResponse;
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join(' '));
  if (!result.data?.updateProduct) throw new Error('The API did not return the updated product.');
  return result.data.updateProduct;
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    const catalog = await fetchCatalog('', 'All', false);
    setProducts(catalog.products);
    setCategories(catalog.categories);
  }

  useEffect(() => {
    let active = true;
    fetchCatalog('', 'All', false)
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setCategories(data.categories);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load inventory.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => products.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`
      .toLowerCase().includes(search.trim().toLowerCase())
  ), [products, search]);

  const unitsInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStock = products.filter((p) => p.stock < 5).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  function update(field: keyof ProductForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price.toFixed(2),
      stock: String(product.stock),
    });
    setNotice('');
    setError('');
    document.getElementById('gf-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEdit() {
    if (saving) return;
    setEditingId(null);
    setForm(initialForm);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setNotice('');
    setError('');
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
      setError('Price must be positive, and stock must be a nonnegative whole number.');
      return;
    }
    setSaving(true);
    try {
      if (editingId !== null) {
        const saved = await updateProduct({
          id: editingId,
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          price,
          stock,
        });
        setNotice(`${saved.name} (SKU ${saved.sku}) was updated successfully.`);
        setEditingId(null);
      } else {
        const created = await createProduct({
          sku: form.sku.trim().toUpperCase(),
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          price,
          stock,
        });
        setNotice(`${created.name} (SKU ${created.sku}) was created successfully.`);
      }
      setForm((current) => ({ ...initialForm, category: current.category }));
      try { await refresh(); }
      catch { setError('Product saved, but inventory refresh failed. Reload the page to update the table.'); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="gf-admin">
      <header className="gf-admin-topbar">
        <div className="container-lg d-flex justify-content-between align-items-center py-3 gap-3">
          <a className="gf-admin-logo" href="/">◇ GEMFLOW <span>ADMIN</span></a>
          <nav className="d-flex align-items-center gap-3" aria-label="Admin navigation">
            <a className="gf-admin-back" href="/admin/orders">Manage orders →</a>
            <a className="gf-admin-back" href="/">View storefront ↗</a>
          </nav>
        </div>
      </header>
      <main className="container-lg py-5">
        <div className="d-flex flex-wrap align-items-end justify-content-between mb-4 gap-2">
          <div>
            <p className="gf-admin-eyebrow mb-2">CATALOG OPERATIONS / LOCAL DEMO</p>
            <h1 className="gf-admin-title">Product & inventory management</h1>
            <p className="gf-admin-muted">Manage jewelry products using React, GraphQL, C#/.NET and SQL Server.</p>
          </div>
          <a className="btn btn-outline-secondary" href="https://gemflow-api-677007020371.us-east1.run.app/graphql" target="_blank" rel="noreferrer">Explore GraphQL ↗</a>
        </div>

        <div className="row g-3 mb-4">
          {[
            ['Total products', String(products.length)],
            ['Units in stock', String(unitsInStock)],
            ['Low stock (<5)', String(lowStock)],
            ['Inventory value', money(inventoryValue)],
          ].map(([label, value]) => (
            <div className="col-6 col-lg-3" key={label}>
              <section className="gf-admin-stat h-100">
                <span>{label}</span>
                <strong>{loading ? '…' : value}</strong>
              </section>
            </div>
          ))}
        </div>

        {notice && <div className="alert alert-success" role="status">{notice}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="row g-4">
          <div className="col-lg-5">
            <section id="gf-product-form" className="gf-admin-panel p-4 h-100">
              <p className="gf-admin-eyebrow">{editingId === null ? 'NEW CATALOG ITEM' : 'EDIT CATALOG ITEM'}</p>
              <h2 className="h4 mb-3">{editingId === null ? 'Add a jewelry product' : 'Edit jewelry product'}</h2>
              <form onSubmit={submit}>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="gf-sku">SKU</label>
                    <input id="gf-sku" className="form-control" required maxLength={40}
                      placeholder="RG-9002" value={form.sku} readOnly={editingId !== null}
                      onChange={(e) => update('sku', e.target.value)} />
                    {editingId !== null && <div className="form-text">SKU stays unchanged when editing.</div>}
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="gf-category">Category</label>
                    <select id="gf-category" className="form-select" value={form.category}
                      onChange={(e) => update('category', e.target.value)}>
                      {Array.from(new Set(['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Gemstones', ...categories])).map((category) =>
                        <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="gf-name">Product name</label>
                    <input id="gf-name" className="form-control" required maxLength={120}
                      placeholder="Classic Gold Band" value={form.name}
                      onChange={(e) => update('name', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="gf-description">Description</label>
                    <textarea id="gf-description" className="form-control" rows={3} maxLength={1000}
                      value={form.description} onChange={(e) => update('description', e.target.value)} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="gf-price">Price (USD)</label>
                    <input id="gf-price" className="form-control" type="number" step="0.01" min="0.01" required
                      placeholder="299.99" value={form.price}
                      onChange={(e) => update('price', e.target.value)} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="gf-stock">Available stock</label>
                    <input id="gf-stock" className="form-control" type="number" min="0" step="1" required
                      value={form.stock} onChange={(e) => update('stock', e.target.value)} />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button type="submit" className="btn gf-admin-primary flex-grow-1" disabled={saving || loading}>
                    {saving ? 'Saving to SQL Server…' : editingId === null ? 'Create product →' : 'Save changes →'}
                  </button>
                  {editingId !== null && <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>}
                </div>
                <p className="gf-admin-muted small mt-3 mb-0">
                  {editingId === null ? 'Changes are saved through the live GraphQL API. Use a unique SKU for each product.' : 'Updates are saved through GraphQL to SQL Server. Setting stock to 0 marks an item out of stock.'}
                </p>
              </form>
            </section>
          </div>
          <div className="col-lg-7">
            <section className="gf-admin-panel p-4 h-100">
              <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                <div><p className="gf-admin-eyebrow">LIVE SQL SERVER DATA</p><h2 className="h4 mb-0">Inventory</h2></div>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => {
                  setError('');
                  void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Refresh failed.'));
                }}>Refresh ↻</button>
              </div>
              <label className="visually-hidden" htmlFor="gf-search">Search inventory</label>
              <input id="gf-search" className="form-control mb-3" placeholder="Search name, SKU or category"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="table-responsive">
                <table className="table align-middle gf-admin-table">
                  <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map((p) => <tr key={p.id}>
                      <td><strong>{p.name}</strong><small>{p.sku} · {p.category}</small></td>
                      <td className="text-nowrap">{money(p.price)}</td>
                      <td><span className={`badge ${p.stock === 0 ? 'text-bg-danger' : p.stock < 5 ? 'text-bg-warning' : 'text-bg-success'}`}>{p.stock}</span></td>
                      <td><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(p)} disabled={saving} aria-label={`Edit ${p.name}`}>Edit</button></td>
                    </tr>)}
                  </tbody>
                </table>
                {!loading && filtered.length === 0 && <p className="text-secondary small">No products match your search.</p>}
                {loading && <p className="text-secondary small">Loading SQL Server inventory…</p>}
              </div>
            </section>
          </div>
        </div>
        <p className="gf-admin-security mt-4">Local prototype only: product creation and editing are not yet protected by admin authentication. Do not deploy these write operations publicly.</p>
      </main>
    </div>
  );
}
