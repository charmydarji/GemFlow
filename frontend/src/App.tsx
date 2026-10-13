import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchCatalog, placeOrder } from './gql';
import { ProductArt } from './components/ProductArt';
import { previewHero, previewProducts } from './demoData';
import type { CartItem, HeroContent, OrderResponse, Product } from './types';

const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const defaultCategories = ['Bracelets', 'Earrings', 'Gemstones', 'Necklaces', 'Rings'];
const partnerApi = import.meta.env.VITE_PARTNER_API_URL ?? 'http://localhost:5100/api/partner/catalog';

export default function App() {
  const [products, setProducts] = useState<Product[]>(previewProducts);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [hero, setHero] = useState<HeroContent>(previewHero);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [preview, setPreview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmed, setConfirmed] = useState<OrderResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // A short debounce avoids a request for every keystroke.
    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchCatalog(search.trim(), category, inStockOnly, controller.signal);
        if (controller.signal.aborted) return;
        setProducts(result.products);
        setCategories(result.categories);
        if (result.hero) setHero(result.hero);
        setPreview(false);
        setApiError('');
      } catch (error) {
        if (controller.signal.aborted) return;
        const matches = previewProducts.filter((p) =>
          (category === 'All' || p.category === category) &&
          (!inStockOnly || p.stock > 0) &&
          (`${p.name} ${p.sku}`.toLowerCase().includes(search.trim().toLowerCase()))
        );
        setProducts(matches);
        setPreview(true);
        setApiError(error instanceof Error ? error.message : 'Could not reach the API');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [category, search, inStockOnly]);

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0), [cart]);
  const featuredProduct = previewProducts[0];

  function addToCart(product: Product) {
    if (product.stock < 1) return;
    setConfirmed(null);
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id
        ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
        : item
      );
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function changeQuantity(id: number, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.product.id !== id) return [item];
      const next = item.quantity + delta;
      return next <= 0 ? [] : [{ ...item, quantity: Math.min(next, item.product.stock) }];
    }));
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || cart.length === 0 || submitting) return;
    setSubmitting(true);
    setOrderError('');
    try {
      const created = await placeOrder(email, cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })));
      setConfirmed(created);
      setCart([]);
      setEmail('');
      // Refresh inventory after completing the order. A refresh failure must not
      // falsely report that the already-committed order failed.
      try {
        const latest = await fetchCatalog(search, category, inStockOnly);
        setProducts(latest.products);
      } catch { /* The next catalog request will refresh inventory. */ }
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Order could not be placed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <div className="announcement">A full-stack jewelry commerce demo <span className="announcement-dot">✦</span> C# · .NET · GraphQL · React</div>
      <header className="site-header">
        <div className="container-lg d-flex justify-content-between align-items-center gap-3 py-3">
          <a className="brand" href="#home" aria-label="GemFlow home"><span className="brand-mark">◇</span> GEM<span>FLOW</span><small>ATELIER / DEMO</small></a>
          <nav className="header-links d-none d-md-flex gap-4" aria-label="Main navigation">
            <a href="#collections">Collections</a>
            <a href="#platform">The platform</a>
            <a href={partnerApi} target="_blank" rel="noreferrer">Partner API ↗</a>
          </nav>
          <button className="cart-trigger" aria-label={`Open cart, ${cartQuantity} items`} onClick={() => setCartOpen(true)}>
            Bag <span className="bag-icon">♧</span><span className="cart-count">{cartQuantity}</span>
          </button>
        </div>
      </header>

      {preview && !loading && (
        <div className="preview-notice" role="status">
          <div className="container-lg">Preview mode · Showing sample products because the C#/.NET API is offline. Start Docker Compose to enable live SQL Server data and checkout.
            <span className="visually-hidden"> API issue: {apiError}</span>
          </div>
        </div>
      )}

      <main>
        <section className="hero" id="home">
          <div className="container-lg">
            <div className="row align-items-center g-0 hero-row">
              <div className="col-lg-6 hero-copy">
                <div className="eyebrow"><span className="short-line" /> THE ART OF THE EVERYDAY</div>
                <h1>{hero.heading}</h1>
                <p className="hero-description">{hero.body}</p>
                <div className="d-flex flex-wrap align-items-center gap-4 mt-4">
                  <a className="btn-primary-custom" href="#collections">Explore collections <span aria-hidden="true">↗</span></a>
                  <span className="hero-secondary">Timeless pieces, modern commerce</span>
                </div>
                <div className="hero-proof"><div className="proof-bar" /><span>Crafted with intention.</span><span>Built for every experience.</span></div>
              </div>
              <div className="col-lg-6 hero-visual">
                <div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/>
                <div className="hero-product-ring"><div className="hero-stone"/><div className="hero-ring-band"/></div>
                <div className="hero-float-card"><small>THE FEATURED EDIT</small><strong>{featuredProduct.name}</strong><span>Discover elevated essentials →</span></div>
                <span className="hero-sparkle hero-sparkle-1">✧</span><span className="hero-sparkle hero-sparkle-2">✦</span>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-strip" id="platform" aria-label="Platform capabilities">
          <div className="container-lg d-flex flex-wrap justify-content-between gap-3">
            <span><b>01</b> LIVE INVENTORY</span><span><b>02</b> GRAPHQL STOREFRONT</span><span><b>03</b> CUSTOMER CATALOG FEEDS</span><span><b>04</b> CMS-READY CONTENT</span>
          </div>
        </section>

        <section id="collections" className="catalog-section container-lg">
          <div className="catalog-heading d-flex justify-content-between align-items-end gap-3 flex-wrap">
            <div><div className="eyebrow eyebrow-dark">EXPLORE THE COLLECTION</div><h2>Discover your next favorite.</h2><p>Modern essentials, selected with care.</p></div>
            <span className="results-count">{loading ? 'Loading collection…' : `${products.length} pieces available to browse`}</span>
          </div>
          <div className="toolbar d-flex flex-wrap align-items-center gap-3">
            <div className="category-tabs d-flex gap-2 flex-wrap" role="group" aria-label="Filter by category">
              {['All', ...categories].map((name) => (
                <button key={name} type="button" className={`category-tab ${category === name ? 'selected' : ''}`} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
              ))}
            </div>
            <div className="filters-end d-flex align-items-center flex-wrap gap-3 ms-lg-auto">
              <label className="search-box"><span aria-hidden="true">⌕</span><span className="visually-hidden">Search products</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pieces or SKU" /></label>
              <label className="stock-check"><input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} /> In stock only</label>
            </div>
          </div>

          <div className="row g-4 product-grid" aria-live="polite" aria-busy={loading}>
            {products.map((product) => (
              <div key={product.id} className="col-12 col-sm-6 col-lg-3">
                <article className="product-card">
                  <div className="product-image-wrap">
                    <ProductArt product={product} />
                    {product.featured && <span className="product-tag">FEATURED</span>}
                    {product.stock === 0 && <span className="sold-out-tag">SOLD OUT</span>}
                  </div>
                  <div className="product-info"><div className="product-meta">{product.category} <span>{product.sku}</span></div><h3>{product.name}</h3><p>{product.description}</p>
                    <div className="product-footer"><strong>{usd(product.price)}</strong><button type="button" aria-label={`Add ${product.name} to bag`} disabled={product.stock === 0} onClick={() => addToCart(product)}>{product.stock > 0 ? 'Add to bag ↗' : 'Unavailable'}</button></div>
                  </div>
                </article>
              </div>
            ))}
          </div>
          {!loading && products.length === 0 && <div className="empty-products">No pieces match those filters. Try another search or collection.</div>}
        </section>
        <section className="bottom-banner container-lg"><div><span className="eyebrow">BUILT BEYOND THE SHOWROOM</span><h2>Beautiful shopping. Reliable systems.</h2><p>This demo connects a responsive React UI to a .NET GraphQL API, SQL Server stock data, and a partner-facing catalog feed.</p></div><div className="bottom-banner-gem">◇</div></section>
      </main>
      <footer className="site-footer"><div className="container-lg d-flex justify-content-between flex-wrap gap-2"><span>◇ GEMFLOW © 2026 · PORTFOLIO DEMONSTRATION</span><span>Fictional inventory · No payments are collected</span></div></footer>

      {cartOpen && <div className="cart-root"><button aria-label="Close cart" className="cart-backdrop" onClick={() => setCartOpen(false)} />
        <aside className="cart-panel" role="dialog" aria-modal="true" aria-label="Your shopping bag">
          <div className="cart-header d-flex justify-content-between align-items-center"><div><div className="eyebrow eyebrow-dark">YOUR SELECTION</div><h2>Your bag <span>({cartQuantity})</span></h2></div><button className="close-btn" aria-label="Close bag" onClick={() => setCartOpen(false)}>×</button></div>
          {confirmed ? <div className="order-confirm"><div className="success-symbol">✓</div><h3>Order received!</h3><p>Demo order <strong>#{confirmed.id}</strong> for <strong>{confirmed.email}</strong></p><p>Total: <strong>{usd(confirmed.total)}</strong></p><small>No payment was collected.</small><button className="btn-primary-custom mt-4" onClick={() => { setCartOpen(false); setConfirmed(null); }}>Continue exploring →</button></div>
            : <><div className="cart-items">
              {cart.length === 0 ? <div className="empty-cart"><span>◇</span><h3>Your bag is waiting.</h3><p>Find a piece you love and add it here.</p><button className="btn-primary-custom" onClick={() => setCartOpen(false)}>Explore collection →</button></div>
                : cart.map(({ product, quantity }) => <div key={product.id} className="cart-line"><div className="cart-thumb"><ProductArt product={product}/></div><div className="cart-line-details"><small>{product.category} / {product.sku}</small><strong>{product.name}</strong><span>{usd(product.price)}</span><div className="quantity-controls"><button aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)}>−</button><span>{quantity}</span><button aria-label={`Add one ${product.name}`} disabled={quantity >= product.stock} onClick={() => changeQuantity(product.id, 1)}>+</button></div></div></div>)}
            </div>{cart.length > 0 && <div className="checkout-area"><div className="subtotal d-flex justify-content-between"><span>Subtotal</span><strong>{usd(cartTotal)}</strong></div><p>Demo checkout · No real purchase or payment</p><form onSubmit={checkout}><label htmlFor="checkout-email">Email address</label><input id="checkout-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><button className="btn-primary-custom checkout-button" disabled={preview || submitting}>{submitting ? 'Placing order…' : preview ? 'Connect API to place an order' : 'Place demo order →'}</button>{orderError && <div className="order-error" role="alert">{orderError}</div>}</form></div>}</>}
        </aside>
      </div>}
    </div>
  );
}
