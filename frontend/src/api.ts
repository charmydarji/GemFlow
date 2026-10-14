// Production API requests share the site's origin through the Vercel rewrites.
// Login and protected GraphQL requests must use the same cookie host.
export const apiBase = import.meta.env.PROD
  ? window.location.origin
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:5100');

export const graphqlEndpoint = import.meta.env.PROD
  ? `${apiBase}/graphql`
  : (import.meta.env.VITE_GRAPHQL_URL ?? `${apiBase}/graphql`);
