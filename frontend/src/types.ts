export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  symbol: string;
  featured: boolean;
}
export interface HeroContent { heading: string; body: string }
export interface CartItem { product: Product; quantity: number }
export interface OrderResponse { id: number; email: string; total: number; createdAtUtc: string }
