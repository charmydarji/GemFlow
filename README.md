# GemFlow — Jewelry E-Commerce Platform

A small, independent, **fictional jewelry catalog** that demonstrates all nine technologies the recruiter named: **C#, .NET, SQL Server, TypeScript, JavaScript, React, AWS, GraphQL, Bootstrap**.

> This project is *inspired by a common jewelry/e-commerce workflow*. It is not affiliated with Stuller, does not use proprietary data, and does not collect payments.

## What's inside (first milestone)

- `frontend/`: React + TypeScript + Bootstrap responsive catalog, search, category filters, in-stock toggle, cart, and demo checkout. UI uses clearly labeled **preview data if the API is offline**.
- `backend/`: C# / ASP.NET Core (.NET 10) API with Hot Chocolate GraphQL, EF Core and SQL Server; a small CMS-like homepage content record; order mutation with inventory updates.
- `backend/Program.cs`: GraphQL endpoint `/graphql`, health `/health`, and customer website partner catalog feed `/api/partner/catalog` (REST).
- `docker-compose.yml`: SQL Server 2022 and .NET API.
- `scripts/verify-api.mjs`: vanilla JavaScript API smoke test.
- `infra/AWS-DEPLOYMENT.md`: planned AWS setup (not yet deployed).

## First run — frontend preview (no backend required)

Prerequisite: **Node.js 20.19+ or 22.12+** with npm.

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. You should see eight preview products and a banner saying the backend is offline. Filtering, search and cart work; placing an order requires the API.

## Full-stack local run

Prerequisite: **Docker Desktop** (sufficient RAM; SQL Server requires ~2 GB or more) and Node.js.

1. Open a terminal at this project's root and create your *local* environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and choose a **unique strong SQL Server password** (do not use the placeholder for anything but local testing).
3. Start the SQL Server and .NET API containers:

   ```bash
   docker compose up --build -d
   docker compose logs -f api
   ```

   On first boot, SQL Server can take a minute to initialize. The API retries database initialization. To leave logs, press **Ctrl+C** (containers continue running).
4. From a second terminal, run the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Test these URLs:
   - Storefront: **http://localhost:5173**
   - GraphQL: **http://localhost:5100/graphql**
   - Partner catalog JSON: **http://localhost:5100/api/partner/catalog**
   - Health: **http://localhost:5100/health**
6. From the root, verify GraphQL and partner APIs with **JavaScript**:

   ```bash
   node scripts/verify-api.mjs
   ```

### GraphQL sample

```graphql
query {
  products(category: "Rings", inStockOnly: true) {
    id sku name price stock
  }
  hero { heading body }
}
```

Add one or more items in the storefront cart to try this mutation through the checkout UI:

```graphql
mutation {
  placeOrder(email: "test@example.com", items: [{ productId: 1, quantity: 1 }]) {
    id total email createdAtUtc
  }
}
```

The backend computes prices from the database, updates stock, and writes order lines in a SQL transaction. This is a **learning/demo checkout, not a payment integration**.

### Apple Silicon Mac limitation (important)

Microsoft SQL Server's 2022 Linux image targets **x86-64, not native Apple Silicon (ARM64)**. The Compose file requests `linux/amd64`, but Docker Desktop emulation/Rosetta on M-series MacBooks is **not an officially supported SQL Server setup** and may fail. If you hit SQL Server container errors, use a remote SQL Server instance (e.g. SQL Server on a supported x86 host or a cloud managed SQL Server instance) and run the .NET API locally with a `ConnectionStrings__Shop` environment variable. Avoid using a production database or exposing SQL Server publicly.

## Architecture

```text
React + TypeScript + Bootstrap (5173)
          │ POST /graphql
          ▼
C# ASP.NET Core / .NET 10 (5100)
 ├── GraphQL queries: products, product, categories, hero
 ├── GraphQL mutation: placeOrder (checks available stock)
 └── REST partner catalog feed: /api/partner/catalog
          │ EF Core
          ▼
       SQL Server
    Products | StoreContent | CustomerOrders | OrderLines
```

**AWS:** Planned deployment to S3 + CloudFront (frontend), ECS Fargate (.NET API), RDS SQL Server, Secrets Manager, and CloudWatch. See `infra/AWS-DEPLOYMENT.md`. This project does *not* claim to be deployed to AWS.

## Next milestones

1. **Milestone 1 (this version):** end-to-end product catalog + inventory-aware demo checkout + partner feed.
2. **Milestone 2:** customer-specific pricing and inventory caching/refresh; GraphQL paging.
3. **Milestone 3:** CMS administration for the hero/banner and content publishing workflow.
4. **Milestone 4:** tests, migrations, auth, monitoring and AWS deployment.

## Interview explanation (30 seconds)

"I built a jewelry commerce demo that connects a React and TypeScript storefront to a C#/.NET backend. The GraphQL API serves products from SQL Server, and the app checks stock before creating an order. I also added a REST catalog feed that could support partner websites and a small CMS-style record for homepage content. I used Bootstrap for responsiveness and mapped out an AWS deployment with ECS, RDS and CloudFront."

## Security and scope

- Demo seed initialization uses EF Core `EnsureCreated`. For real releases, create EF Core migrations.
- The partner feed and order action are **not authenticated**. Do not publish publicly without auth, authorization, rate limits, error handling and privacy safeguards.
- No customer payments are processed or stored. Orders are fictional learning data only.
