// API requests share the site's origin through Vercel or the Vite dev proxy.
// Login and protected GraphQL requests must use the same cookie host.
export const apiBase = import.meta.env.PROD
  ? window.location.origin
  : (import.meta.env.VITE_API_URL ?? window.location.origin);

export const graphqlEndpoint = import.meta.env.PROD
  ? `${apiBase}/graphql`
  : (import.meta.env.VITE_GRAPHQL_URL ?? `${apiBase}/graphql`);
