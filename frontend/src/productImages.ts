/**
 * GemFlow illustrative product photography (not Stuller merchandise).
 * Photos: Unsplash License; individual credits in PHOTO-CREDITS.md.
 * The fictional catalog names/prices/SKUs do not identify photographed items.
 * Replace URLs with product-matched licensed photos before selling goods.
 */
const photos = {
  rings: 'https://images.unsplash.com/photo-1492714485642-dd6df6baafa2?auto=format&fit=crop&w=750&q=85',
  necklaces: 'https://images.unsplash.com/photo-1625792508272-bc6ad2788b14?auto=format&fit=crop&w=750&q=85',
  earrings: 'https://images.unsplash.com/photo-1771173652661-8245a9d94095?auto=format&fit=crop&w=750&q=85',
  bracelets: 'https://images.unsplash.com/photo-1770394644046-c875d8c42714?auto=format&fit=crop&w=750&q=85',
  gemstones: 'https://images.unsplash.com/photo-1613843351058-1dd06fda7c02?auto=format&fit=crop&w=750&q=85',
} as const;

/** Optional per-product photos. Change the URL for any SKU at any time. */
export const productImageUrls: Record<string, string> = {
  'RG-1001': photos.rings,
  'RG-1002': photos.rings,
  'RG-9001': photos.rings,
  'NK-2042': photos.necklaces,
  'NK-2056': photos.necklaces,
  'NK-2001': photos.necklaces,
  'ER-3320': photos.earrings,
  'ER-3381': photos.earrings,
  'BR-4081': photos.bracelets,
  'GM-5903': photos.gemstones,
};

/** For any new SKU created through Admin, use a category photo as a preview. */
export function productImageUrl(sku?: string, category?: string): string | undefined {
  const direct = sku ? productImageUrls[sku.trim().toUpperCase()] : undefined;
  const byCategory = category ? photos[category.trim().toLowerCase() as keyof typeof photos] : undefined;
  const url = direct || byCategory;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || (parsed.hostname === 'localhost' && parsed.protocol === 'http:')) return url;
  } catch { /* Fall back to illustration on invalid URL. */ }
  return undefined;
}
