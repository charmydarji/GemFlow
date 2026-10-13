# AWS deployment roadmap (not deployed yet)

Architecture proposal for a real environment:
- **React + TypeScript + Bootstrap** static output on **Amazon S3** behind **Amazon CloudFront** (HTTPS).
- **C#/.NET 10** ASP.NET Core API built into a container on **Amazon ECS Fargate** behind an ALB.
- **SQL Server** hosted on **Amazon RDS for SQL Server** (private subnet; secure credentials using AWS Secrets Manager).
- **GraphQL** is exposed by `/graphql`; the partner REST catalog feed is `/api/partner/catalog`.
- **Amazon CloudWatch** stores application logs/metrics; **IAM** controls service access.

Do not deploy this learning demo as-is: configure auth/authorization for orders and feeds, input limits,
GraphQL complexity limits, rate limiting, migrations, secret management, tracing, TLS, and operational monitoring.
Never use a public `sa` account for a production database.

**Suggested interview explanation:**
"I'd put the React UI on S3 and CloudFront, run the .NET API in ECS Fargate, and place SQL Server on RDS.
I'd keep the database private, use Secrets Manager for credentials, and add authentication and caching before enabling partner API feeds."
