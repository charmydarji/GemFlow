import { useEffect, useMemo, useState } from 'react';
import { graphqlEndpoint as endpoint } from './api';

type OrderStatus = 'Placed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

type OrderLine = {
  id: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type CustomerOrder = {
  id: number;
  email: string;
  createdAtUtc: string;
  statusUpdatedAtUtc: string | null;
  status: OrderStatus;
  total: number;
  lines: OrderLine[];
};

type GraphQLResult<T> = { data?: T; errors?: Array<{ message: string }> };
const money = (amount: number) => new Intl.NumberFormat('en-US', {
  currency: 'USD', style: 'currency',
}).format(amount);
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const transitions: Record<OrderStatus, OrderStatus[]> = {
  Placed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
const progressStages: OrderStatus[] = ['Placed', 'Processing', 'Shipped', 'Delivered'];

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GemFlow-Admin': '1' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`API request failed (HTTP ${response.status}).`);
  const result = await response.json() as GraphQLResult<T>;
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(' '));
  if (!result.data) throw new Error('The API did not return data.');
  return result.data;
}

async function fetchOrders(): Promise<CustomerOrder[]> {
  const result = await graphql<{ orders: CustomerOrder[] }>(`
    query OrderDashboard {
      orders {
        id email createdAtUtc statusUpdatedAtUtc total status
        lines { id sku productName quantity unitPrice }
      }
    }
  `);
  return result.orders;
}

async function changeStatus(orderId: number, status: OrderStatus): Promise<CustomerOrder> {
  const result = await graphql<{ updateOrderStatus: CustomerOrder }>(`
    mutation ChangeOrderStatus($orderId: Int!, $status: String!) {
      updateOrderStatus(orderId: $orderId, status: $status) {
        id email createdAtUtc statusUpdatedAtUtc total status
        lines { id sku productName quantity unitPrice }
      }
    }
  `, { orderId, status });
  return result.updateOrderStatus;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'All' | OrderStatus>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    const latest = await fetchOrders();
    setOrders(latest);
    setSelectedId((current) => latest.some((o) => o.id === current)
      ? current : (latest[0]?.id ?? null));
  }

  useEffect(() => {
    let mounted = true;
    fetchOrders().then((list) => {
      if (!mounted) return;
      setOrders(list);
      setSelectedId(list[0]?.id ?? null);
    }).catch((reason: unknown) => {
      if (mounted) setError(reason instanceof Error ? reason.message : 'Could not load orders.');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => orders.filter((order) => {
    if (filter !== 'All' && order.status !== filter) return false;
    const haystack = `#${order.id} ${order.id} ${order.email} ${order.lines.map((line) => line.sku).join(' ')}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [orders, filter, search]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const sales = orders.filter((o) => o.status !== 'Cancelled');
  const revenue = sales.reduce((total, order) => total + order.total, 0);
  const inProgress = orders.filter((o) => ['Placed', 'Processing', 'Shipped'].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === 'Delivered').length;
  const cancelled = orders.filter((o) => o.status === 'Cancelled').length;

  async function reload() {
    setRefreshing(true);
    setError('');
    try { await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh orders.'); }
    finally { setRefreshing(false); }
  }

  async function updateStatus(status: OrderStatus) {
    if (!selected || saving || !transitions[selected.status].includes(status)) return;
    const id = selected.id;
    if (status === 'Cancelled' && !window.confirm(`Cancel order #${id}? Reserved inventory will be returned to stock.`)) return;
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const saved = await changeStatus(id, status);
      setOrders((current) => current.map((order) => order.id === id ? saved : order));
      setNotice(`Order #${id} moved to ${saved.status}.${saved.status === 'Cancelled' ? ' Inventory was restored.' : ''}`);
      // A fresh query also catches updates made from another tab.
      try { await refresh(); }
      catch { setError('Status saved, but refreshing the order list failed. Try Refresh.'); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the order.');
    } finally { setSaving(false); }
  }

  return (
    <div className="gf-admin gf-orders">
      <header className="gf-admin-topbar">
        <div className="container-lg d-flex justify-content-between align-items-center flex-wrap gap-3 py-3">
          <a className="gf-admin-logo" href="/">◇ GEMFLOW <span>OPERATIONS</span></a>
          <nav className="d-flex flex-wrap gap-4" aria-label="Admin navigation">
            <a className="gf-admin-back" href="/admin">Products & inventory</a>
            <a className="gf-admin-back gf-orders-current" href="/admin/orders" aria-current="page">Orders</a>
            <a className="gf-admin-back" href="/">Storefront ↗</a>
          </nav>
        </div>
      </header>

      <main className="container-lg py-5">
        <div className="d-flex flex-wrap align-items-end justify-content-between mb-4 gap-3">
          <div>
            <p className="gf-admin-eyebrow mb-2">FULFILMENT OPERATIONS / LOCAL DEMO</p>
            <h1 className="gf-admin-title">Order management</h1>
            <p className="gf-admin-muted mb-0">Track customer orders, inspect line items, and update fulfilment status in SQL Server.</p>
          </div>
          <button type="button" className="btn btn-outline-secondary" disabled={loading || refreshing || saving} onClick={() => { void reload(); }}>
            {refreshing ? 'Refreshing…' : '↻ Refresh orders'}
          </button>
        </div>

        <div className="row g-3 mb-4">
          {[
            ['Total orders', String(orders.length), 'All recorded orders'],
            ['Order value', money(revenue), 'Excludes cancellations'],
            ['In progress', String(inProgress), 'Placed, processing or shipped'],
            ['Delivered', String(delivered), `${cancelled} cancelled`],
          ].map(([label, value, description]) => (
            <div className="col-6 col-lg-3" key={label}>
              <section className="gf-admin-stat h-100">
                <span>{label}</span>
                <strong>{loading ? '…' : value}</strong>
                <small className="gf-orders-subtext">{description}</small>
              </section>
            </div>
          ))}
        </div>

        {notice && <div className="alert alert-success" role="status">{notice}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="row g-4 align-items-start">
          <div className="col-xl-8">
            <section className="gf-admin-panel p-4">
              <div className="d-flex flex-wrap gap-3 align-items-end justify-content-between mb-3">
                <div>
                  <p className="gf-admin-eyebrow">LIVE SQL SERVER DATA</p>
                  <h2 className="h4 mb-0">Customer orders</h2>
                </div>
                <span className="gf-admin-muted">Showing latest 100 orders</span>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-sm-7">
                  <label className="visually-hidden" htmlFor="gf-order-search">Search by number, customer, or SKU</label>
                  <input id="gf-order-search" className="form-control" value={search}
                    onChange={(event) => setSearch(event.target.value)} placeholder="Search order #, email, SKU" />
                </div>
                <div className="col-sm-5">
                  <label className="visually-hidden" htmlFor="gf-order-filter">Filter by status</label>
                  <select id="gf-order-filter" className="form-select" value={filter}
                    onChange={(event) => setFilter(event.target.value as 'All' | OrderStatus)}>
                    {(['All', 'Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const)
                      .map((status) => <option key={status} value={status}>{status === 'All' ? 'All statuses' : status}</option>)}
                  </select>
                </div>
              </div>

              {loading ? <p className="gf-admin-muted py-3">Loading orders from SQL Server…</p>
                : filtered.length === 0 ? (
                  <div className="gf-orders-empty">
                    <strong>{orders.length === 0 ? 'No orders yet' : 'No matching orders'}</strong>
                    <p>{orders.length === 0 ? 'Place a demo order from the storefront first. No payment information is required.' : 'Try a different search or status filter.'}</p>
                    {orders.length === 0 && <a href="/" className="btn gf-admin-primary">Open storefront →</a>}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle gf-admin-table gf-orders-table">
                      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th><span className="visually-hidden">Action</span></th></tr></thead>
                      <tbody>
                        {filtered.map((order) => <tr key={order.id} className={order.id === selectedId ? 'gf-orders-selected' : ''}>
                          <td><strong>#{order.id}</strong><small>{formatDate(order.createdAtUtc)}</small></td>
                          <td className="gf-orders-email" title={order.email}>{order.email}</td>
                          <td className="text-nowrap">{money(order.total)}</td>
                          <td><span className={`gf-order-badge gf-order-${order.status.toLowerCase()}`}>{order.status}</span></td>
                          <td><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedId(order.id)} aria-label={`View order ${order.id}`} aria-pressed={order.id === selectedId}>View</button></td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
            </section>
          </div>

          <div className="col-xl-4">
            <section className="gf-admin-panel p-4 gf-orders-detail" aria-label="Order details">
              {selected ? <>
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <p className="gf-admin-eyebrow">ORDER DETAILS</p>
                    <h2 className="h4 mb-0">Order #{selected.id}</h2>
                  </div>
                  <span className={`gf-order-badge gf-order-${selected.status.toLowerCase()}`}>{selected.status}</span>
                </div>
                <p className="gf-admin-muted">Placed {formatDate(selected.createdAtUtc)}</p>
                <div className="gf-orders-info"><span>Customer</span><strong className="gf-orders-email">{selected.email}</strong></div>
                <div className="gf-orders-info"><span>Line items</span><strong>{selected.lines.reduce((total, line) => total + line.quantity, 0)} units</strong></div>
                <hr className="gf-orders-divider" />
                <p className="gf-admin-eyebrow mb-2">ITEMS</p>
                <ul className="gf-orders-lines">
                  {selected.lines.map((line) => (
                    <li key={line.id}>
                      <div><strong>{line.productName}</strong><small>{line.sku} · Qty {line.quantity} × {money(line.unitPrice)}</small></div>
                      <b>{money(line.unitPrice * line.quantity)}</b>
                    </li>
                  ))}
                </ul>
                <div className="gf-orders-total"><span>Order total</span><strong>{money(selected.total)}</strong></div>
                <hr className="gf-orders-divider" />
                <p className="gf-admin-eyebrow mb-2">FULFILMENT PROGRESS</p>
                {selected.status === 'Cancelled' ? <p className="gf-orders-cancel-note">This order was cancelled. Reserved units have been returned to inventory.</p> : (
                  <ol className="gf-orders-progress">
                    {progressStages.map((stage, index) => <li className={index <= progressStages.indexOf(selected.status) ? 'complete' : ''} key={stage}>{stage}</li>)}
                  </ol>
                )}
                {selected.statusUpdatedAtUtc && <p className="gf-admin-muted mt-2">Last updated {formatDate(selected.statusUpdatedAtUtc)}</p>}
                {transitions[selected.status].length > 0 ? (
                  <div className="d-grid gap-2 mt-3">
                    {transitions[selected.status].map((next) => <button key={next} type="button" disabled={saving} onClick={() => { void updateStatus(next); }}
                      className={`btn ${next === 'Cancelled' ? 'btn-outline-danger' : 'gf-admin-primary'}`}>
                      {saving ? 'Saving…' : next === 'Cancelled' ? 'Cancel order & restore stock' : `Mark as ${next}`}
                    </button>)}
                  </div>
                ) : <p className="gf-admin-muted mt-3 mb-0">This order is in a final status and cannot be changed.</p>}
              </> : <div className="gf-orders-empty"><strong>Order details</strong><p>Select an order in the table to view its contents.</p></div>}
            </section>
          </div>
        </div>

        <p className="gf-admin-security mt-4">Local demo only: order details include customer emails, and the GraphQL management endpoints are not yet protected by admin authorization. Do not expose them publicly.</p>
      </main>
    </div>
  );
}
