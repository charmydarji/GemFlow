import { productImageUrl } from '../productImages';
import type { Product } from '../types';

type ProductDisplay = Pick<Product, 'symbol' | 'category' | 'sku' | 'name'>;

export function ProductArt({ product, large = false }: { product: ProductDisplay; large?: boolean }) {
  const group = product.category.toLowerCase();
  const photoUrl = productImageUrl(product.sku, product.category);

  return (
    <div className={`product-art product-art--${group} ${large ? 'product-art--large' : ''}`}>
      <div className="art-halo" aria-hidden="true" />
      <span className="product-emoji" aria-hidden="true">{product.symbol}</span>
      <span className="art-star art-star--one" aria-hidden="true">✧</span>
      <span className="art-star art-star--two" aria-hidden="true">✦</span>
      {photoUrl && (
        <img
          className="product-photo"
          src={photoUrl}
          alt={`${product.name} — illustrative product photo`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            // Keep the original illustrated placeholder when a link expires,
            // requires login, or blocks direct embedding.
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
