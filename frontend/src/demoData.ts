import type { HeroContent, Product } from './types';

// Used only as an explicitly labeled UI preview when the .NET API is offline.
export const previewHero: HeroContent = {
  heading: 'Details that make a statement.',
  body: 'Explore thoughtfully selected pieces for every customer and every occasion.',
};
export const previewProducts: Product[] = [
  { id: 1, sku: 'RG-1001', name: 'Solstice Gold Ring', category: 'Rings', description: 'A refined everyday stacking band in a warm gold finish.', price: 189, stock: 16, symbol: '💍', featured: true },
  { id: 2, sku: 'NK-2042', name: 'Luna Pendant Necklace', category: 'Necklaces', description: 'A delicate pendant with a luminous polished surface.', price: 265, stock: 9, symbol: '✨', featured: true },
  { id: 3, sku: 'ER-3320', name: 'Celeste Drop Earrings', category: 'Earrings', description: 'Modern drop earrings with a balanced, sculptural silhouette.', price: 148, stock: 12, symbol: '🌟', featured: true },
  { id: 4, sku: 'BR-4081', name: 'Harbor Chain Bracelet', category: 'Bracelets', description: 'An adjustable chain bracelet with a timeless profile.', price: 122, stock: 24, symbol: '🔗', featured: false },
  { id: 5, sku: 'GM-5903', name: 'Sapphire Accent Stone', category: 'Gemstones', description: 'A brilliant sapphire-colored accent for custom jewelry design.', price: 320, stock: 3, symbol: '💎', featured: true },
  { id: 6, sku: 'RG-1002', name: 'Aurora Signet Ring', category: 'Rings', description: 'A modern statement ring with a softly polished face.', price: 215, stock: 0, symbol: '💍', featured: false },
  { id: 7, sku: 'NK-2056', name: 'Golden Hour Chain', category: 'Necklaces', description: 'A versatile layering chain with a subtle golden glow.', price: 176, stock: 17, symbol: '📿', featured: false },
  { id: 8, sku: 'ER-3381', name: 'Pearl Light Studs', category: 'Earrings', description: 'Minimal studs inspired by classic pearl jewelry.', price: 99, stock: 21, symbol: '🤍', featured: false },
];
