# GemFlow — Full-Stack Jewelry E-Commerce Platform

**React + TypeScript storefront · C# / ASP.NET Core (.NET 10) API · GraphQL · SQL Server · Vercel + Google Cloud**

GemFlow is an independent, fictional jewelry e-commerce portfolio project demonstrating a complete storefront and backend workflow: browsing products, managing a cart, placing **demo orders**, administering products and inventory, and managing order fulfillment. It pairs a responsive React UI with an ASP.NET Core GraphQL/REST API backed by Microsoft SQL Server.

> **Portfolio/demo only.** GemFlow is not affiliated with or endorsed by Stuller or any other jewelry retailer. Its products and orders are for demonstration purposes. **No real payments are collected or processed.**

## Live demo and links

| Resource                 | URL                                                                                                     | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Live storefront**      | [gemflow-cyan.vercel.app](https://gemflow-cyan.vercel.app/)                                             | Browse jewelry, search/filter, manage a cart, and try demo checkout |
| **Admin dashboard**      | [gemflow-cyan.vercel.app/admin](https://gemflow-cyan.vercel.app/admin)                                  | Admin login, product and inventory management                       |
| **Order management**     | [gemflow-cyan.vercel.app/admin/orders](https://gemflow-cyan.vercel.app/admin/orders)                    | View and manage demo orders (admin authorization required)          |
| **GraphQL API**          | [Cloud Run /graphql](https://gemflow-api-677007020371.us-east1.run.app/graphql)                         | GraphQL endpoint / API explorer when enabled                        |
| **API health**           | [Cloud Run /health](https://gemflow-api-677007020371.us-east1.run.app/health)                           | Backend availability check                                          |
| **Partner catalog feed** | [Cloud Run /api/partner/catalog](https://gemflow-api-677007020371.us-east1.run.app/api/partner/catalog) | Public REST/JSON jewelry catalog                                    |
| **Source code**          | [GitHub — charmydarji/GemFlow](https://github.com/charmydarji/GemFlow)                                  | Frontend, backend, scripts, and local development configuration     |

The backend's base URL (`https://gemflow-api-677007020371.us-east1.run.app/`) is an **API service**, not a website; an HTTP 404 at `/` is normal if no root route is defined. Use `/health`, `/graphql`, or `/api/partner/catalog` to test it.

## Current deployment status (October 2026)

- **Frontend:** Deployed to **Vercel** at [`gemflow-cyan.vercel.app`](https://gemflow-cyan.vercel.app/).
- **Backend:** Deployed to **Google Cloud Run** as `gemflow-api` in `us-east1` (South Carolina), using a Docker-based .NET 10 image built from the GitHub repository.
- **Database:** **Google Cloud SQL for SQL Server 2022 Express**, instance `gemflow-sql`, database `GemFlowDb`, region `us-east1`.
- **Database connectivity:** A **Cloud SQL Auth Proxy sidecar** (`cloud-sql-proxy`) connects the .NET container to Cloud SQL. The backend uses its local proxy listener on SQL Server port `1433`.
- **Verified live:** `/health` returned `{ "status": "ok", "service": "GemFlow API" }`; the partner catalog returned jewelry product JSON; storefront products loaded after resolving frontend/Cloud Run CORS configuration.
- **Still to verify end to end:** Admin-authorized product updates and order-management mutations from the Vercel domain, and a successful demo checkout that persists to the hosted database. An admin screen showing **“Signed in as admin”** by itself does **not** prove that the backend receives the authorization cookie for protected mutations.

The application is a demonstration deployment, **not a hardened production commerce service**.

## Features

### Customer storefront

- Responsive jewelry product catalog with product photos / illustrative imagery
- Product search, category filters, and availability filtering
- Cart with quantity controls and calculated totals
- Demo checkout using backend inventory validation and server-calculated pricing when the API is available
- Clearly labeled preview/sample products when the live API cannot be reached

### Product and inventory administration

- Admin sign-in and protected API operations
- Add new catalog products through GraphQL
- Edit product names, descriptions, categories, prices, and stock quantities
- Inventory overview, stock counts, low-stock indicators, and catalog search
- Persist catalog changes in SQL Server, reflected in the storefront once successfully authorized and saved

### Order management

- View customer orders, line items, quantities, totals, and fulfillment status
- Search/filter orders and update fulfillment status
- Workflow: **Placed → Processing → Shipped → Delivered**
- Cancel eligible unshipped orders and restore reserved inventory
- Require administrator authorization for staff operations

### APIs and testing

- **GraphQL:** Catalog and category queries, product create/edit operations, checkout/order workflows, and staff order queries/mutations
- **REST:** Public JSON partner catalog (`GET /api/partner/catalog`)
- **Authentication:** Server-validated admin credentials and an HTTP-only session cookie
- **Verification:** JavaScript smoke/integration tests for API health, inventory, catalog data, invalid checkout, and authorization

## Technology stack

| Layer             | Technologies                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend          | React, TypeScript, JavaScript, Vite, Bootstrap, HTML/CSS                                                                                        |
| Backend           | C#, ASP.NET Core (.NET 10), Hot Chocolate GraphQL, REST APIs                                                                                    |
| Data access       | Entity Framework Core, Microsoft SQL Server                                                                                                     |
| Local development | Docker, Docker Compose, Git, GitHub                                                                                                             |
| Deployment        | **Vercel** (frontend), **Google Cloud Run** (backend), **Google Cloud SQL** (SQL Server), Cloud Build / Artifact Registry, Cloud SQL Auth Proxy |
| Tests             | Node.js built-in test runner and API verification scripts                                                                                       |

## Architecture

```text
Browser
  │
  ▼
Vercel — React / TypeScript / Vite
  │  HTTPS GraphQL / REST requests
  │  (CORS allows the deployed Vercel origin)
  ▼
Google Cloud Run — ASP.NET Core .NET 10 (gemflow-api)
  │
  ├── /health                    health status
  ├── /graphql                   product + order APIs
  ├── /api/partner/catalog       public REST feed
  └── admin authentication / protected operations
  │
  ▼
Cloud SQL Auth Proxy sidecar (local TCP port 1433)
  │
  ▼
Google Cloud SQL — SQL Server 2022 Express
  └── GemFlowDb                  products, inventory, orders
```

The Cloud SQL **instance connection name** used for the proxy is:

```text
project-c54d6b08-f7cc-4cb5-b54:us-east1:gemflow-sql
```

The instance connection name is not a credential. **Never commit or publish the SQL Server password, admin password, complete connection string, or private `.env` files.**

## Repository structure

```text
GemFlow/
├── frontend/                  # React storefront, admin pages, product assets
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── OrderManagement.tsx
│   │   └── AdminGate.tsx
│   └── vercel.json            # Vercel SPA routing (and API rewrites, if configured)
├── backend/                   # ASP.NET Core API
│   ├── Data/                  # EF Core DbContext and seed data
│   ├── GraphQL/               # Queries and mutations
│   ├── Models/                # Entities
│   ├── Security/              # Admin authentication helpers
│   ├── Dockerfile
│   └── Program.cs
├── scripts/                   # API and auth verification scripts
├── docker-compose.yml        # Local API + SQL Server
├── .env.example               # Environment variable template; no secrets
├── .gitignore
└── README.md
```

## Run locally

### Requirements

- **Node.js 20.19+** (or a compatible newer version) and npm
- **Docker Desktop** (for a local SQL Server/API stack)
- Git

### 1. Clone and configure

```bash
git clone https://github.com/charmydarji/GemFlow.git
cd GemFlow
cp .env.example .env
```

Edit `.env` and set your **local** SQL Server and administrator credentials. Use a unique admin password of **at least 16 characters**. Do not commit `.env`.

### 2. Start SQL Server and the .NET API

```bash
docker compose up -d --build
docker compose ps
```

On first startup, SQL Server may take time to initialize. If necessary, inspect:

```bash
docker compose logs --tail=60 db
docker compose logs --tail=60 api
```

### 3. Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

| Local resource  | URL                                       |
| --------------- | ----------------------------------------- |
| Storefront      | http://localhost:5173                     |
| Admin           | http://localhost:5173/admin               |
| Orders          | http://localhost:5173/admin/orders        |
| GraphQL         | http://localhost:5100/graphql             |
| Health          | http://localhost:5100/health              |
| Partner catalog | http://localhost:5100/api/partner/catalog |

**Apple Silicon:** SQL Server's container targets x86-64. Docker emulation / Rosetta may be necessary on an M-series Mac; this is not an officially supported native Apple Silicon SQL Server configuration.

## Cloud deployment configuration

### Frontend: Vercel

Import the `charmydarji/GemFlow` repository into Vercel and configure:

| Setting          | Value                             |
| ---------------- | --------------------------------- |
| Framework preset | **Vite**                          |
| Root directory   | `frontend`                        |
| Build            | `npm run build`                   |
| Output           | `dist`                            |
| Production site  | `https://gemflow-cyan.vercel.app` |

The frontend currently uses these environment variable names (set them for **Production**):

```dotenv
VITE_GRAPHQL_URL=https://gemflow-api-677007020371.us-east1.run.app/graphql
VITE_API_URL=https://gemflow-api-677007020371.us-east1.run.app
VITE_PARTNER_API_URL=https://gemflow-api-677007020371.us-east1.run.app/api/partner/catalog
```

These URLs are public client configuration, **not secrets**. For a Vite application, environment-variable changes take effect only after **rebuilding/redeploying** the frontend.

**Optional same-origin approach for cookie-based administration:** If an API proxy is configured in `frontend/vercel.json` to forward `/graphql` and `/api/*` to Cloud Run, set the frontend API variables to the corresponding **Vercel-domain** URLs instead. Route API rewrites before the React SPA fallback. Do not mix a proxy configuration with direct Cloud Run URLs without checking how the frontend issues login and GraphQL requests.

### Backend: Google Cloud Run

| Setting            | Value                                  |
| ------------------ | -------------------------------------- |
| Service            | `gemflow-api`                          |
| Region             | `us-east1`                             |
| Docker build       | `backend/Dockerfile`                   |
| API container port | `8080`                                 |
| Billing/scaling    | Request-based, scale to zero when idle |
| Database           | `GemFlowDb` on `gemflow-sql`           |

The ASP.NET Core container uses the following runtime configuration:

| Setting                   | Purpose                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `FrontendOrigin`          | Must match `https://gemflow-cyan.vercel.app` **exactly** for CORS (no trailing slash) |
| `ConnectionStrings__Shop` | SQL Server connection string; includes sensitive credentials                          |
| `Admin__Username`         | Demo administrator login                                                              |
| `Admin__Password`         | Strong demo admin password (at least 16 characters)                                   |

With the Cloud SQL Auth Proxy listening inside the Cloud Run service, the connection-string format is:

```text
Server=127.0.0.1,1433;Database=GemFlowDb;User Id=sqlserver;Password=<SQL_SERVER_PASSWORD>;Encrypt=True;TrustServerCertificate=True;
```

Use a strong SQL Server password, keep secrets out of Git, and preferably manage sensitive values in **Google Secret Manager**. The Cloud Run service account needs the **Cloud SQL Client** role for the proxy to authenticate. The proxy accepts the instance connection name as its command-line argument; SQL Server uses port `1433` by default.

> **Security note:** Public API access is appropriate for the demo storefront, but **protected admin mutations must still enforce server-side authentication**. The `run.app` and `vercel.app` domains are cross-site; browser cookie policy can prevent an admin cookie from being sent even when the UI shows an apparent signed-in state. Use an audited same-origin API proxy or intentionally configured HTTPS cross-site cookies and CSRF protection. Don't mark admin product editing as fully tested until a mutation succeeds and persists.

### Database: Google Cloud SQL

- **Engine:** SQL Server 2022 Express
- **Instance:** `gemflow-sql`
- **Database:** `GemFlowDb`
- **Region:** `us-east1` (South Carolina)
- **Configuration used for the demo:** Single-zone, 1 vCPU, 3.75 GiB RAM, 10 GiB SSD (verify current settings in Cloud SQL)
- **Networking:** Public IP was retained during setup; the application accesses the instance through a Cloud SQL Auth Proxy sidecar.

**Cost awareness:** Cloud SQL is **not permanently free**. A running instance can continue consuming Google Cloud trial credits even when the website has no visitors. Monitor billing and delete unused cloud resources when finished with the demo.

## GraphQL examples

Read products and categories:

```graphql
query {
  products(category: "Rings", inStockOnly: true) {
    id
    sku
    name
    price
    stock
  }
  categories
}
```

Create a demo catalog item (requires a valid authenticated administrator session):

```graphql
mutation {
  createProduct(
    sku: "RG-9002"
    name: "Aurora Gold Ring"
    category: "Rings"
    description: "Minimal gold ring for everyday wear"
    price: 229.99
    stock: 8
  ) {
    id
    sku
    name
    price
    stock
  }
}
```

**Staff mutations must not be publicly accessible without authorization.**

## Smoke tests and verification

From the repository root, with a backend running:

```bash
node --test scripts/test-gemflow.mjs
```

The suite covers API health, product queries, catalog/partner feed, inventory filtering, invalid checkout, and admin authorization. Additional verification scripts are available under `scripts/`.

### Live test checklist

1. Open the [health endpoint](https://gemflow-api-677007020371.us-east1.run.app/health) and confirm a JSON status response.
2. Open the [partner catalog feed](https://gemflow-api-677007020371.us-east1.run.app/api/partner/catalog) and confirm product JSON.
3. Open the [storefront](https://gemflow-cyan.vercel.app/) and confirm jewelry catalog data loads without a preview/offline warning.
4. In Chrome DevTools → **Network → Fetch/XHR**, check requests to `/graphql` and confirm no CORS or GraphQL errors.
5. Add a product to the bag, adjust quantity, and attempt a **demo** checkout (no real payment).
6. Sign into the [admin dashboard](https://gemflow-cyan.vercel.app/admin), update a test item's stock/price, refresh, and confirm SQL Server persisted it.
7. Check the [orders dashboard](https://gemflow-cyan.vercel.app/admin/orders) and verify demo order creation and status transitions.

Passing the catalog and health endpoints **does not** automatically prove that checkout or authenticated staff mutations work.

## Known limitations / future improvements

- **Demo payments only:** No production payment processor or real-payment checkout.
- **Admin cross-domain cookies:** The session/cookie behavior across Vercel and Cloud Run needs end-to-end validation for protected product and order operations; use a same-origin proxy or a fully reviewed cross-site auth approach.
- **Database schema:** The project currently uses EF Core `EnsureCreated`/seed initialization; a production release should adopt tracked migrations.
- **Security hardening:** Persistent Data Protection keys, production-grade account management, CSRF protection, stronger secret management, audit logs, and query/rate limits.
- **Operational enhancements:** Pagination, observability/alerts, improved inventory workflows, and richer content management.
- **Images:** Demo/illustrative imagery is used; use assets with appropriate rights.

## 30-second project overview

> I built GemFlow, a full-stack jewelry e-commerce demo with a React and TypeScript storefront deployed to Vercel and a C#/.NET 10 GraphQL API deployed to Google Cloud Run. The application uses Microsoft SQL Server on Google Cloud SQL for its product inventory and order data, with a Cloud SQL Auth Proxy connecting the API to the database. Customers can browse jewelry and try a demo checkout, while the project also includes admin product, inventory, and order-management workflows, a REST partner catalog feed, and API verification tests.

---

**Disclaimer:** GemFlow is an independent educational/portfolio project. It is not affiliated with or endorsed by Stuller or any retailer and does not process real payments.
