import { getDbPool, inMemoryStore } from '../db';

/**
 * Injects rich Open Graph (OG), Twitter cards, and Google Schema.org Product Rich Snippet
 * (Price, Stock Status, Currency, Brand, Ratings) directly into HTML for Google Shopping & Search.
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
    let storeName = 'Twing Central Marketplace';

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
        storeName = productRow.store_name || 'Twing Central Marketplace';
      }
    } else {
      const p = (inMemoryStore.products || []).find((x: any) => x.id === productId || x.sku === productId);
      if (p) {
        productRow = p;
        const s = (inMemoryStore.online_store_configs || []).find((x: any) => x.userId === p.userId || x.user_id === p.userId);
        storeName = s?.storeName || s?.store_name || 'Twing Central Marketplace';
      }
    }

    if (!productRow) return html;

    const prodName = productRow.name || 'পণ্য';
    const price = productRow.sale_price ?? productRow.salePrice ?? 0;
    const originalPrice = productRow.original_price ?? productRow.originalPrice ?? price;
    const stock = Number(productRow.stock ?? 1);
    const inStock = stock > 0;
    const category = productRow.category || 'জেনারেল';
    const title = `${prodName} - ৳${price} | ${storeName} – TwingHisabi`;
    const cleanDesc = productRow.description
      ? String(productRow.description).slice(0, 180).replace(/"/g, '&quot;')
      : `${storeName} থেকে আকর্ষণীয় মূল্যে "${prodName}" কিনুন। সেন্ট্রাল মার্কেটপ্লেস ও অনলাইন ক্যাশ অন ডেলিভারি সুবিধা।`;
    const image = productRow.image_url || productRow.imageUrl || 'https://twinghisabi.site/icon-512.png';

    // Replace or inject Title
    let modified = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    // Replace or inject meta description
    if (modified.includes('name="description"')) {
      modified = modified.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${cleanDesc}" />`);
    } else {
      modified = modified.replace('</head>', `<meta name="description" content="${cleanDesc}" />\n</head>`);
    }

    // Replace Open Graph tags
    modified = modified.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
    modified = modified.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${cleanDesc}" />`);
    modified = modified.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${image}" />`);
    modified = modified.replace(/<meta property="og:image:secure_url" content=".*?" \/>/i, `<meta property="og:image:secure_url" content="${image}" />`);
    modified = modified.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${fullUrl}" />`);
    modified = modified.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="product" />`);

    // Replace Twitter card tags
    modified = modified.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${title}" />`);
    modified = modified.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${cleanDesc}" />`);
    modified = modified.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${image}" />`);
    modified = modified.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${fullUrl}" />`);

    // Inject Google Schema.org Product Rich Snippet (Enables Price, Availability, Image on Google Search)
    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: prodName,
      image: [image],
      description: cleanDesc,
      sku: productRow.sku || productRow.id,
      mpn: productRow.id,
      brand: {
        '@type': 'Brand',
        name: storeName,
      },
      category: category,
      offers: {
        '@type': 'Offer',
        url: fullUrl,
        priceCurrency: 'BDT',
        price: price,
        priceValidUntil: '2027-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: storeName,
        },
      },
    };

    const schemaTag = `<script type="application/ld+json">${JSON.stringify(productSchema)}</script>\n</head>`;
    modified = modified.replace('</head>', schemaTag);

    return modified;
  } catch (err) {
    console.error('Error injecting product SEO meta tags:', err);
    return html;
  }
}

/**
 * Injects Central Marketplace specific OpenGraph & SEO tags when visiting central marketplace
 */
export function injectMarketplaceSeo(html: string, fullUrl: string): string {
  try {
    const title = 'TwingMall Central Marketplace – টুইং সেন্ট্রাল মার্কেটপ্লেস | খাঁটি ও সেরা পণ্য';
    const desc = 'বাংলাদেশের সেরা ভেরিফাইড মার্চেন্টদের সরাসরি উৎপাদিত খাঁটি খাদ্যপণ্য, প্রিমিয়াম গ্রোসারি, লাইফস্টাইল ও ইলেকট্রনিক্স। ক্যাশ অন ডেলিভারিতে দ্রুত সারা দেশে ডেলিভারি।';
    const image = 'https://twinghisabi.site/icon-512.png';

    let modified = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    modified = modified.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
    modified = modified.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`);
    modified = modified.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`);
    modified = modified.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${image}" />`);
    modified = modified.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${fullUrl}" />`);
    modified = modified.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${title}" />`);
    modified = modified.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${desc}" />`);
    modified = modified.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${image}" />`);
    modified = modified.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${fullUrl}" />`);

    return modified;
  } catch (e) {
    return html;
  }
}

/**
 * Triggers real-time indexing pings to Google & IndexNow (Bing, Yandex, Seznam)
 * whenever a vendor creates or publishes a product on Central Marketplace.
 */
export async function notifySearchEnginesOnProductPublish(productId: string, productName: string) {
  const canonicalUrl = `https://centralmarketplace.twinghisabi.site/?product=${encodeURIComponent(productId)}`;
  const sitemapUrl = 'https://centralmarketplace.twinghisabi.site/api/marketplace/sitemap.xml';

  console.log(`[SEO-INDEXER] 🚀 Auto-triggering instant indexing ping for "${productName}" (${canonicalUrl})`);

  // 1. Google WebSub / Ping for Sitemap updates
  try {
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    fetch(googlePingUrl, { method: 'GET', signal: AbortSignal.timeout(4000) })
      .then(res => {
        console.log(`[SEO-INDEXER] Google ping status: ${res.status}`);
      })
      .catch(err => {
        // Non-blocking catch
        console.log(`[SEO-INDEXER] Google ping dispatched (${err.message})`);
      });
  } catch (e) {
    // Ignore ping network quirks
  }

  // 2. IndexNow Protocol (Instant indexing protocol used by Bing, Microsoft Edge, and major search engines)
  try {
    const indexNowPayload = {
      host: 'centralmarketplace.twinghisabi.site',
      key: 'twinghisabi_instant_index_key',
      keyLocation: 'https://centralmarketplace.twinghisabi.site/indexnow-key.txt',
      urlList: [canonicalUrl, 'https://centralmarketplace.twinghisabi.site/'],
    };

    fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(indexNowPayload),
      signal: AbortSignal.timeout(4000),
    })
      .then(res => {
        console.log(`[SEO-INDEXER] IndexNow instant dispatch response: ${res.status}`);
      })
      .catch(() => {
        // Dispatched in background
      });
  } catch (e) {
    // Non-blocking
  }
}

