# GemFlow — Full-Stack Jewelry E-Commerce Platform

GemFlow is an independent, fictional jewelry e-commerce application built to demonstrate end-to-end product development, from a responsive shopping experience to backend APIs, inventory management, and staff administration.

It uses **React, TypeScript, JavaScript, Bootstrap, C#, ASP.NET Core (.NET 10), GraphQL, Entity Framework Core, and SQL Server**.

> **Project Scope:** GemFlow is a portfolio/demo application, not affiliated with Stuller or any other jewelry retailer. It uses demonstration product data and does **not** process real payments.

## Features

### Customer Storefront

- Responsive jewelry catalog with product images and fallback illustrations
- Product search and category filtering
- In-stock product filtering
- Shopping cart and demo checkout
- Inventory-aware ordering with backend stock validation
- Product prices calculated from SQL Server
- Preview products when the API is offline

### Product and Inventory Management

- Admin login and protected dashboard
- Create new jewelry products using GraphQL
- Edit product names, descriptions, categories, and prices
- Update inventory quantities
- View and filter product inventory
- Persist changes in SQL Server
- Automatically reflect product updates in the storefront

### Order Management

- View customer orders and purchased products
- View order quantities, prices, and totals
- Search and filter orders
- Manage order fulfillment statuses:
  - Placed
  - Processing
  - Shipped
  - Delivered
- Cancel eligible orders
- Restore reserved inventory for cancelled orders
- Restrict administrative operations to authenticated users

### Authentication and Security

- Administrator login and logout
- Protected admin routes
- HTTP-only authentication cookies
- Server-side credential validation
- GraphQL authorization for administrative operations
- Environment-based credential configuration
- Authentication and authorization testing

### APIs and Integrations

- GraphQL product queries and mutations
- GraphQL order management
- REST-based partner catalog feed
- ASP.NET Core API endpoints
- Entity Framework Core integration
- SQL Server database persistence
- Input validation and error handling

## Technology Stack

| Layer                         | Technologies                                       |
| ----------------------------- | -------------------------------------------------- |
| Frontend                      | React, TypeScript, JavaScript, Bootstrap, Vite     |
| Backend                       | C#, ASP.NET Core (.NET 10), GraphQL, Hot Chocolate |
| Database                      | Microsoft SQL Server, Entity Framework Core        |
| APIs                          | GraphQL, REST                                      |
| Authentication                | ASP.NET Core, HTTP-only session cookies            |
| Containerization              | Docker, Docker Compose                             |
| Testing                       | JavaScript, Node.js Test Runner                    |
| Version Control               | Git, GitHub                                        |
| Frontend Deployment (Planned) | Vercel                                             |
| Backend Deployment (Planned)  | Railway                                            |
| Database Hosting (Planned)    | Hosted SQL Server                                  |

## Project Architecture

```text
                GemFlow E-Commerce
                        |
                        v
          React + TypeScript + Bootstrap
                        |
              GraphQL / REST API
                        |
                        v
               ASP.NET Core (.NET)
                        |
           +------------+------------+
           |                         |
           v                         v
    GraphQL Queries            GraphQL Mutations
           |                         |
           +------------+------------+
                        |
                        v
               Entity Framework Core
                        |
                        v
                   SQL Server
                        |
          +-------------+-------------+
          |             |             |
       Products       Orders       Inventory
```

## Repository Structure

```text
GemFlow/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminGate.tsx
│   │   ├── OrderManagement.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── backend/
│   ├── Data/
│   │   ├── ShopDbContext.cs
│   │   └── SeedData.cs
│   ├── GraphQL/
│   │   ├── Query.cs
│   │   └── Mutation.cs
│   ├── Models/
│   │   └── Entities.cs
│   ├── Security/
│   │   └── AdminSecurity.cs
│   ├── Program.cs
│   ├── appsettings.json
│   ├── GemFlow.Api.csproj
│   └── Dockerfile
│
├── scripts/
│   ├── verify-api.mjs
│   ├── verify-orders.mjs
│   └── test-gemflow.mjs
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Make sure the following tools are installed:

- Node.js 20.19+ or a compatible newer version
- npm
- Docker Desktop
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/charmydarji/GemFlow.git
cd GemFlow
```

### 2. Configure Environment Variables

Create a local `.env` file:

```bash
cp .env.example .env
```

Update the environment variables with your local SQL Server credentials and administrator credentials.

**Important:**

- Use a strong SQL Server password.
- The administrator password must contain at least 16 characters.
- Never commit `.env` files or credentials to GitHub.

### 3. Start the Backend and Database

From the project root:

```bash
docker compose up -d --build
```

Check the running containers:

```bash
docker compose ps
```

View API logs:

```bash
docker compose logs --tail=60 api
```

The backend uses ASP.NET Core, GraphQL, Entity Framework Core, and SQL Server.

### 4. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the application:

**http://localhost:5173**

## Application URLs

| Application         | URL                                       |
| ------------------- | ----------------------------------------- |
| Customer Storefront | http://localhost:5173                     |
| Admin Dashboard     | http://localhost:5173/admin               |
| Order Management    | http://localhost:5173/admin/orders        |
| GraphQL API         | http://localhost:5100/graphql             |
| API Health Check    | http://localhost:5100/health              |
| Partner Catalog API | http://localhost:5100/api/partner/catalog |

## GraphQL Examples

### Fetch Products

```graphql
query {
  products {
    id
    sku
    name
    category
    price
    stock
  }
  categories
}
```

### Create a Product

Requires administrator authentication.

```graphql
mutation {
  createProduct(
    sku: "RG-9002"
    name: "Aurora Gold Ring"
    category: "Rings"
    description: "Minimal gold ring for everyday wear."
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

### Place a Demo Order

```graphql
mutation {
  placeOrder(
    email: "test@example.com"
    items: [{ productId: 1, quantity: 1 }]
  ) {
    id
    total
    email
    createdAtUtc
  }
}
```

The backend validates stock, calculates prices using database records, and saves the order.

**Note:** This is a demonstration checkout. No real payments are processed.

## Automated Testing

GemFlow includes JavaScript-based automated API and security tests.

Run:

```bash
node --test scripts/test-gemflow.mjs
```

### Test Coverage

1. API health endpoint
2. GraphQL product catalog and categories
3. REST partner catalog consistency
4. In-stock product filtering
5. Invalid checkout rejection
6. Administrator authentication
7. Protection of customer order data
8. Authorization for staff order mutations

An optional authenticated-admin scenario is also available:

```bash
node scripts/test-gemflow.mjs --with-admin
```

## Apple Silicon Compatibility

Microsoft SQL Server 2022's Linux container targets x86-64 architecture.

On Apple Silicon Macs (M1, M2, M3, and M4), Docker Desktop may require emulation or Rosetta.

This configuration is not officially supported by Microsoft and may experience compatibility issues.

For a more reliable deployment, use SQL Server on a supported x86-64 environment.

## Deployment

### Current Status

The full-stack application has been developed and tested locally using Docker.

Public cloud deployment is planned but is not yet complete.

### Frontend — Vercel

The React frontend will be deployed using Vercel.

Configuration:

```text
Framework: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

### Backend — Railway

The ASP.NET Core API is planned for deployment using Railway or another Docker-compatible hosting platform.

The backend includes:

- C# and ASP.NET Core
- GraphQL API
- REST endpoints
- Authentication and authorization
- Entity Framework Core database integration

### Database — Hosted SQL Server

SQL Server will run separately using persistent storage on a supported hosting environment.

Production database credentials will be managed through environment variables or the hosting provider's secret-management facilities.

### Production Security Requirements

Before publicly exposing the application:

- Configure HTTPS
- Secure authentication cookies
- Implement CSRF protection
- Configure API routing and CORS appropriately
- Protect environment variables and secrets
- Add appropriate rate limiting
- Configure logging and monitoring
- Use managed database migrations

## Future Enhancements

- Product pagination and advanced search
- Customer-specific product pricing
- Inventory synchronization and caching
- Homepage CMS content management
- Improved product image management
- Expanded automated integration testing
- Production monitoring and observability
- CI/CD deployment pipelines
- Database migration management
- Enhanced authentication and authorization

## Project Overview

GemFlow demonstrates full-stack software engineering through a jewelry e-commerce application.

The platform combines a responsive React and TypeScript storefront with a C#/.NET GraphQL backend and SQL Server database.

Customers can browse jewelry products, filter categories, and place demo orders. Administrators can securely manage products, inventory, and order fulfillment.

The project also includes REST API integrations, automated JavaScript testing, and a containerized local development environment.

## Disclaimer

GemFlow is an independent educational and portfolio project.

It is not affiliated with, sponsored by, or endorsed by Stuller or any other jewelry retailer.

Product information is fictional, images are illustrative, and the application does not process real payments.
