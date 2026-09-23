import { getDbPool, inMemoryStore } from '../db';

/**
 * Injects rich Open Graph (OG) and Twitter card meta tags into raw HTML for social media crawlers
 * (Facebook, WhatsApp, Twitter, Telegram, Messenger, etc.) and direct links.
 */
export async function injectProductSeo(
  html: string,
  productId: string,
  host: string,
  fullUrl: string
): Promise<string> {
  try {
    const pool = getDbPool();
    let productRow: any = null;
    let storeName = 'অনলাইন স্টোর';

    if (pool) {
      const res = await pool.query(
        `SELECT p.*, s.store_name, s.custom_domain, s.store_slug 
         FROM products p
         LEFT JOIN online_store_configs s ON s.user_id = p.user_id
         WHERE p.id = $1 OR p.sku = $1
         LIMIT 1`,
        [productId]
      );
      if (res.rows.length > 0) {
        productRow = res.rows[0];
        storeName = productRow.store_name || 'অনলাইন স্টোর';
      }
    } else {
      const p = (inMemoryStore.products || []).find((x: any) => x.id === productId || x.sku === productId);
      if (p) {
        productRow = p;
        const s = (inMemoryStore.online_store_configs || []).find((x: any) => x.userId === p.userId || x.user_id === p.userId);
        storeName = s?.storeName || s?.store_name || 'অনলাইন স্টোর';
      }
    }

    if (!productRow) return html;

    const prodName = productRow.name || 'পণ্য';
    const price = productRow.sale_price ?? productRow.salePrice ?? 0;
    const title = `${prodName} - ৳${price} | ${storeName}`;
    const desc = productRow.description
      ? String(productRow.description).slice(0, 180).replace(/"/g, '&quot;')
      : `${storeName} থেকে আকর্ষণীয় মূল্যে "${prodName}" অর্ডার করুন। ক্যাশ অন ডেলিভারি ও দ্রুত হোম ডেলিভারি সুবিধা রয়েছে।`;
    const image = productRow.image_url || productRow.imageUrl || 'https://twinghisabi.site/icon-512.png';

    // Replace or inject Title
    let modified = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    // Replace or inject meta description
    if (modified.includes('name="description"')) {
      modified = modified.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
    } else {
      modified = modified.replace('</head>', `<meta name="description" content="${desc}" />\n</head>`);
    }

    // Replace Open Graph tags
    modified = modified.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
    modified = modified.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`);
    modified = modified.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${image}" />`);
    modified = modified.replace(/<meta property="og:image:secure_url" content=".*?" \/>/i, `<meta property="og:image:secure_url" content="${image}" />`);
    modified = modified.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${fullUrl}" />`);
    modified = modified.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="product" />`);

    // Replace Twitter card tags
    modified = modified.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${title}" />`);
    modified = modified.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${desc}" />`);
    modified = modified.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${image}" />`);
    modified = modified.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${fullUrl}" />`);

    return modified;
  } catch (err) {
    console.error('Error injecting product SEO meta tags:', err);
    return html;
  }
}
