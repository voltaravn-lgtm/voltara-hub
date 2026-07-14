// Content script for Voltara Product Importer
// Runs on shopee.vn product pages to safely extract information.

console.log("Voltara Product Importer Content Script loaded and active.");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SCRAPE_FACEBOOK_POST") {
    scrapeFacebookPost()
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("Facebook post scraper error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep connection open asynchronously
  } else if (request.type === "SCRAPE_PRODUCT") {
    scrapeShopeeProduct()
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("Voltara scraper error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep connection open asynchronously
  } else if (request.type === "GET_PAGE_PRODUCTS") {
    getProductsFromPage()
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("Voltara get shop products error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep connection open asynchronously
  } else if (request.type === "PARSE_PRODUCT_HTML") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(request.html, "text/html");
    scrapeShopeeProduct(doc, request.url)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("Voltara parse HTML error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep connection open asynchronously
  } else if (request.type === "FETCH_PRODUCT_DETAILS_BY_API") {
    fetchProductDetailsByApi(request.itemId, request.shopId, request.url)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("API Fetch error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep connection open asynchronously
  } else if (request.type === "EXTRACT_COMPLETE_PRODUCT") {
    extractCompleteProductData(request)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("Voltara extract complete product error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep connection open asynchronously
  }
  return true; // Keep connection open
});

// Retrieves the Shopee preloaded state via background script execution (MAIN world)
async function getShopeeStateFromWindow() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      {
        type: "GET_SHOPEE_PAGE_STATE"
      },
      response => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response?.state || null);
      }
    );
  });
}

async function fetchProductDetailsByApi(itemId, shopId, fallbackUrl) {
  if (!itemId || !shopId) {
    throw new Error("Mã sản phẩm hoặc mã cửa hàng không hợp lệ");
  }

  const endpoints = [
    `https://shopee.vn/api/v4/pdp/get_pc?shop_id=${shopId}&item_id=${itemId}&detail_level=0`,
    `https://shopee.vn/api/v4/pdp/get_pc?shopid=${shopId}&itemid=${itemId}&detail_level=0`,
    `https://shopee.vn/api/v4/pdp/get_rw?shop_id=${shopId}&item_id=${itemId}&detail_level=0`,
    `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`,
    `https://shopee.vn/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`
  ];

  let lastError = null;

  // Try endpoint fetch with different header/credential strategies
  for (const url of endpoints) {
    // Strategy 1: Headerless, standard credentials fetch (Most robust against anti-bot fingerprinting)
    try {
      const response = await fetch(url, {
        credentials: "include"
      });
      if (response.ok) {
        const resJson = await response.json();
        const itemData = unwrapShopeeItemData(resJson);
        if (itemData) {
          const parsedData = parseShopeeItemData(itemData, fallbackUrl);
          if (parsedData && parsedData.name) {
            return parsedData;
          }
        }
      } else if (response.status === 403) {
        lastError = new Error("Shopee API blocked (403)");
      } else {
        lastError = new Error(`Shopee API lỗi: ${response.status}`);
      }
    } catch (err) {
      lastError = err;
    }

    // Strategy 2: Fetch with customized browser-like headers
    try {
      const response = await fetch(url, {
        headers: {
          "accept": "application/json",
          "x-api-source": "pc",
          "x-requested-with": "XMLHttpRequest",
          "referer": fallbackUrl || "https://shopee.vn"
        },
        credentials: "include"
      });
      if (response.ok) {
        const resJson = await response.json();
        const itemData = unwrapShopeeItemData(resJson);
        if (itemData) {
          const parsedData = parseShopeeItemData(itemData, fallbackUrl);
          if (parsedData && parsedData.name) {
            return parsedData;
          }
        }
      }
    } catch (err) {}
  }

  // Fallback: Fetch detail page HTML and parse preloaded state
  if (fallbackUrl) {
    try {
      console.log(`Fallback: Fetching HTML for ${fallbackUrl}...`);
      const htmlResponse = await fetch(fallbackUrl, {
        credentials: "include"
      });
      if (htmlResponse.ok) {
        const htmlText = await htmlResponse.text();
        const doc = new DOMParser().parseFromString(htmlText, "text/html");
        const item = getShopeeItemFromPreloadedState(doc);
        if (item) {
          const parsedData = parseShopeeItemData(item, fallbackUrl);
          if (parsedData && parsedData.name) {
            return parsedData;
          }
        }
      } else {
        lastError = new Error(`Tải trang HTML trả về lỗi: ${htmlResponse.status}`);
      }
    } catch (htmlErr) {
      lastError = htmlErr;
    }
  }

  throw lastError || new Error("Không thể tải thông tin từ Shopee API");
}

function unwrapShopeeItemData(payload) {
  if (!payload || typeof payload !== "object") return null;

  const candidates = [
    payload.data?.item,
    payload.data?.item_info,
    payload.data?.itemInfo,
    payload.data?.product_info?.item,
    payload.data?.productInfo?.item,
    payload.data,
    payload.item,
    payload.item_info,
    payload
  ];

  for (const candidate of candidates) {
    const item = findNestedItem(candidate);
    if (item) return item;
  }

  return findNestedItem(payload);
}

function parseCurrencyText(text) {
  if (text === null || text === undefined) return null;
  const normalized = String(text).replace(/\u00a0/g, " ").trim();
  if (!normalized) return null;

  const pricePatterns = [
    /(?:₫|đ|Đ|VND)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})\s*(?:₫|đ|Đ|VND)/i,
    /(?:₫|đ|Đ|VND)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})\s*(?:₫|đ|Đ|VND)/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+)/
  ];

  for (const pattern of pricePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = parseInt(match[1].replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }

  return null;
}

function normalizeShopeePrice(rawPrice) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === "") return null;
  if (typeof rawPrice === "string") {
    const parsedTextPrice = parseCurrencyText(rawPrice);
    if (parsedTextPrice) return parsedTextPrice;
  }

  const numericPrice = Number(rawPrice);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) return null;

  // Shopee API multiplies internal prices by 100,000.
  // If the raw price is > 10,000,000, we normalize it.
  if (numericPrice > 10000000) {
    return Math.round(numericPrice / 100000);
  }
  return Math.round(numericPrice);
}

function normalizeShopeeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim().split(/\s+/)[0];
  clean = clean.replace(/@resize[^?#]*/i, "");
  clean = clean.replace(/@!.*$/i, "");
  clean = clean.replace(/_(tn|xs|sm|md|lg|tn_w\d+)(?=([/?#.]|$))/i, "");
  return clean;
}

function toShopeeImageUrl(value) {
  if (!value || typeof value !== "string") return null;
  const cleanValue = normalizeShopeeImageUrl(value);
  if (cleanValue.startsWith("http")) return cleanValue;
  if (/^[a-f0-9]{20,}$/i.test(value) || /^[A-Za-z0-9_-]{20,}$/.test(value)) {
    return `https://down-vn.img.susercontent.com/file/${value}`;
  }
  return null;
}

function getImageUrlFromElement(img) {
  if (!img) return "";
  const srcset = img.getAttribute("srcset") || "";
  const srcsetUrls = srcset.split(",").map(item => item.trim().split(/\s+/)[0]).filter(Boolean);
  const bestSrcsetUrl = srcsetUrls[srcsetUrls.length - 1] || "";
  return img.getAttribute("data-src") ||
    img.getAttribute("data-original") ||
    img.getAttribute("data-lazy-src") ||
    bestSrcsetUrl ||
    img.currentSrc ||
    img.src ||
    img.getAttribute("src") ||
    "";
}

function addImageFromElementToSet(img, targetSet) {
  if (!img || !isCleanProductImage(img)) return;
  const src = getImageUrlFromElement(img);
  const url = toShopeeImageUrl(src) || src;
  if (url && url.startsWith("http")) {
    targetSet.add(normalizeShopeeImageUrl(url));
  }
}

function collectCurrentProductGalleryImages(doc = document) {
  const urls = new Set();
  const containers = [];

  // Open image viewer / modal first. This is the most precise when the user is
  // looking at product images.
  doc.querySelectorAll("[role='dialog'], div[aria-modal='true'], div[class*='modal'], div[class*='Modal']")
    .forEach(el => containers.push(el));

  // Then the product briefing/gallery area near the title.
  doc.querySelectorAll("div[class*='carousel'], div[class*='gallery'], div[class*='product-image'], div[class*='image-gallery']")
    .forEach(el => containers.push(el));

  const h1 = doc.querySelector("h1");
  if (h1) {
    let node = h1.parentElement;
    for (let i = 0; node && i < 5; i += 1) {
      const imgs = node.querySelectorAll("img[src*='cf.shopee.vn/file/'], img[src*='down-vn.img.susercontent.com/file/'], img[data-src*='susercontent.com']");
      if (imgs.length >= 2) {
        containers.push(node);
        break;
      }
      node = node.parentElement;
    }
  }

  containers.forEach(container => {
    container.querySelectorAll("img[src*='cf.shopee.vn/file/'], img[src*='down-vn.img.susercontent.com/file/'], img[data-src*='susercontent.com'], img[srcset*='susercontent.com']")
      .forEach(img => addImageFromElementToSet(img, urls));
  });

  return Array.from(urls).slice(0, 12);
}

function collectShopeeImageUrls(obj, limit = 30) {
  const urls = new Set();
  const seen = new WeakSet();
  const imageKeyPattern = /(image|images|image_id|imageId|image_url|imageUrl|thumbnail|cover|url)/i;

  const visit = (value, key = "", depth = 0) => {
    if (!value || depth > 8 || urls.size >= limit) return;

    if (typeof value === "string") {
      if (imageKeyPattern.test(key) || value.includes("img.susercontent.com") || value.includes("cf.shopee.vn/file/")) {
        const url = toShopeeImageUrl(value);
        if (url) urls.add(url);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => visit(item, key, depth + 1));
      return;
    }

    if (typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      Object.keys(value).forEach(childKey => visit(value[childKey], childKey, depth + 1));
    }
  };

  visit(obj);
  return Array.from(urls);
}

function extractRichDescription(item) {
  const parts = [];
  const pushText = value => {
    if (typeof value === "string") {
      const clean = value.trim();
      if (clean && clean.length > 1 && !parts.includes(clean)) parts.push(clean);
    }
  };

  pushText(item.description);
  pushText(item.description_info?.description);

  const collectNestedText = (value, key = "", depth = 0) => {
    if (!value || depth > 10) return;

    if (typeof value === "string") {
      if (/^(text|content|description|value|title)$/i.test(key) || value.length > 30) {
        pushText(value);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => collectNestedText(item, key, depth + 1));
      return;
    }

    if (typeof value === "object") {
      Object.keys(value).forEach(childKey => collectNestedText(value[childKey], childKey, depth + 1));
    }
  };

  const fields = item.rich_text_description?.field_list || item.description_info?.extended_description?.field_list || item.extended_description?.field_list || [];
  if (Array.isArray(fields)) {
    fields.forEach(field => {
      pushText(field.text);
      pushText(field.value);
      pushText(field.text_info?.text);
    });
  }

  collectNestedText(item.description_info);
  collectNestedText(item.rich_text_description);
  collectNestedText(item.extended_description);
  collectNestedText(item.detailed_description);
  collectNestedText(item.item_description);

  return parts.join("\n\n");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isShopeeCaptchaUrl(url = window.location.href) {
  return /\/verify\/captcha|anti_bot_tracking_id|captcha/i.test(String(url || ""));
}

function buildProductFromListFallback(product, originalUrl) {
  if (!product) return null;
  const externalProductId = product.shopId && product.itemId ? `${product.shopId}_${product.itemId}` : getExternalProductId(originalUrl || product.url || "");
  const images = product.image && product.image.startsWith("http") ? [product.image] : [];

  return {
    source: "shopee",
    sourceUrl: originalUrl || product.url || "",
    externalProductId,
    name: product.name || "",
    sku: externalProductId ? `SP-${externalProductId}` : "",
    price: product.price || null,
    originalPrice: null,
    description: "",
    images,
    variants: [],
    specifications: [],
    seller: {
      name: "Cửa hàng Shopee",
      shopUrl: "https://shopee.vn"
    },
    weight: 500,
    importedAt: new Date().toISOString()
  };
}

function mergeUniqueStrings(...lists) {
  const merged = [];
  const seen = new Set();
  lists.flat().forEach(value => {
    if (typeof value !== "string") return;
    const clean = value.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    merged.push(clean);
  });
  return merged;
}

function mergeProductData(primary, secondary) {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const primaryDescription = primary.description || "";
  const secondaryDescription = secondary.description || "";
  const betterDescription = secondaryDescription.length > primaryDescription.length ? secondaryDescription : primaryDescription;

  return {
    ...primary,
    ...Object.fromEntries(Object.entries(secondary).filter(([, value]) => value !== undefined && value !== null && value !== "")),
    name: primary.name || secondary.name || "",
    sku: primary.sku || secondary.sku || "",
    price: primary.price || secondary.price || null,
    originalPrice: primary.originalPrice || secondary.originalPrice || null,
    description: betterDescription,
    images: mergeUniqueStrings(primary.images || [], secondary.images || []).slice(0, 30),
    variants: (secondary.variants && secondary.variants.length > (primary.variants || []).length) ? secondary.variants : (primary.variants || secondary.variants || []),
    specifications: (secondary.specifications && secondary.specifications.length > (primary.specifications || []).length) ? secondary.specifications : (primary.specifications || secondary.specifications || []),
    seller: {
      ...(secondary.seller || {}),
      ...(primary.seller || {})
    }
  };
}

function extractDescriptionFromDom(doc = document) {
  const directSelectors = [
    "div[style*='white-space: pre-wrap']",
    "section div[style*='white-space']",
    "div[class*='description']",
    "div[class*='Description']",
    "._3-_Lp3"
  ];

  const candidates = [];
  const descriptionHeadings = Array.from(doc.querySelectorAll("h2, h3, div, span")).filter(el => {
    const text = normalizeDomText(el.innerText || el.textContent || "");
    return text === "mo ta san pham" || text === "product description";
  });

  descriptionHeadings.forEach(heading => {
    let scope = heading.parentElement;
    for (let level = 0; scope && level < 4; level += 1) {
      const text = (scope.innerText || scope.textContent || "").trim();
      const headingText = (heading.innerText || heading.textContent || "").trim();
      const afterHeading = text.includes(headingText) ? text.slice(text.indexOf(headingText) + headingText.length).trim() : text;
      if (looksLikeProductDescription(afterHeading)) candidates.push(afterHeading);
      scope = scope.parentElement;
    }
  });

  for (const selector of directSelectors) {
    doc.querySelectorAll(selector).forEach(el => {
      const text = (el.innerText || el.textContent || "").trim();
      if (looksLikeProductDescription(text)) candidates.push(text);
    });
  }

  const allElements = Array.from(doc.querySelectorAll("section, div, article"));
  const headingPatterns = [
    /mô\s*tả\s*sản\s*phẩm/i,
    /mo\s*ta\s*san\s*pham/i,
    /chi\s*tiết\s*sản\s*phẩm/i,
    /thông\s*tin\s*sản\s*phẩm/i,
    /product\s*description/i,
    /description/i
  ];

  for (const el of allElements) {
    const text = (el.innerText || el.textContent || "").trim();
    if (!text || text.length < 80) continue;
    if (headingPatterns.some(pattern => pattern.test(text)) && looksLikeProductDescription(text)) {
      candidates.push(text);
    }
  }

  candidates.sort((a, b) => b.length - a.length);
  return cleanDomDescription(candidates[0] || "");
}

function looksLikeProductDescription(text) {
  if (!text || text.length < 80 || text.length > 20000) return false;
  const lower = text.toLowerCase();
  const normalized = normalizeDomText(text);
  if (normalized.includes("danh muc shopee") || /(kho\s+con hang|han bao hanh|loai bao hanh|gui tu)/i.test(normalized)) return false;
  if (lower.includes("đánh giá sản phẩm") || lower.includes("sản phẩm tương tự") || lower.includes("có thể bạn cũng thích")) return false;
  const signalWords = ["thông số", "chi tiết", "mô tả", "sản phẩm", "bảo hành", "công suất", "điện áp", "kích thước", "trọng lượng", "model"];
  return signalWords.some(word => lower.includes(word));
}

function cleanDomDescription(text) {
  return String(text || "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*(mô\s*tả\s*sản\s*phẩm|chi\s*tiết\s*sản\s*phẩm|thông\s*tin\s*sản\s*phẩm)\s*/i, "")
    .trim()
    .substring(0, 15000);
}

async function preparePageForDetailedScrape() {
  if (document.readyState !== "complete") {
    await new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
  }

  const originalY = window.scrollY;
  const maxScroll = Math.min(document.body.scrollHeight || 0, 12000);
  const stops = [];
  for (let y = 0; y <= maxScroll; y += 900) {
    stops.push(y);
  }
  if (!stops.includes(maxScroll)) stops.push(maxScroll);

  for (const y of stops) {
    window.scrollTo({ top: y, behavior: "instant" });
    await clickShopeeReadMoreButtons();
    await wait(650);
  }

  window.scrollTo({ top: originalY, behavior: "instant" });
  await wait(300);
  await primeShopeeGalleryImages();
}

async function clickShopeeReadMoreButtons() {
  const buttons = Array.from(document.querySelectorAll("button, div[role='button'], a"));
  const readMorePatterns = [
    /xem\s*th[eê]m/i,
    /hi[eể]n\s*th[ịi]\s*th[eê]m/i,
    /show\s*more/i,
    /read\s*more/i
  ];

  for (const el of buttons) {
    const text = (el.innerText || el.textContent || "").trim();
    if (!text || !readMorePatterns.some(pattern => pattern.test(text))) continue;
    try {
      el.click();
      await wait(250);
    } catch (e) {}
  }
}

async function primeShopeeGalleryImages() {
  try {
    const beforeImages = collectCurrentProductGalleryImages(document);
    if (beforeImages.length >= 8) {
      window.__voltaraGalleryImages = beforeImages;
      return;
    }

    const h1 = document.querySelector("h1");
    let scope = h1 ? h1.parentElement : document.body;
    for (let i = 0; scope && i < 7; i += 1) {
      if (scope.querySelectorAll("img[src*='susercontent.com'], img[src*='shopee.vn/file/'], img[srcset*='susercontent.com']").length >= 2) break;
      scope = scope.parentElement;
    }

    const targetImg = scope?.querySelector("img[src*='susercontent.com'], img[src*='shopee.vn/file/'], img[srcset*='susercontent.com']");
    if (!targetImg) return;

    targetImg.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    await wait(800);
    const modalImages = collectCurrentProductGalleryImages(document);
    window.__voltaraGalleryImages = mergeUniqueStrings(beforeImages, modalImages).slice(0, 12);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    await wait(250);
  } catch (e) {}
}

function parseShopeeItemData(item, fallbackUrl) {
  if (!item) return null;

  // Price conversion using robust normalize function
  const price = normalizeShopeePrice(item.price || item.price_min || item.priceMin || item.price_max);
  let originalPrice = normalizeShopeePrice(item.price_before_discount || item.priceBeforeDiscount || item.price_max_before_discount || item.price_min_before_discount);

  if (originalPrice && price && originalPrice <= price) {
    originalPrice = null;
  }

  const images = collectShopeeImageUrls({
    images: item.images,
    image: item.image,
    preview_info: item.preview_info,
    image_info: item.image_info,
    description_info: item.description_info,
    rich_text_description: item.rich_text_description,
    extended_description: item.extended_description,
    detailed_description: item.detailed_description,
    item_description: item.item_description
  });

  // Specifications
  const specifications = [];
  const attributes = item.attributes || item.item_attributes || item.itemAttributes;
  if (attributes && Array.isArray(attributes)) {
    attributes.forEach(attr => {
      const name = attr.name || attr.key || "";
      const value = attr.value || "";
      if (name && value) {
        specifications.push({ name, value });
      }
    });
  }

  // Variants (Phân loại)
  const variants = [];
  const tierVariations = item.tier_variations || item.tierVariations;
  if (tierVariations && Array.isArray(tierVariations)) {
    tierVariations.forEach(tier => {
      const tierName = tier.name || "";
      const options = tier.options || [];
      if (tierName && options.length > 0) {
        variants.push({
          name: tierName,
          options: options
        });
      }
    });
  }

  const description = extractRichDescription(item);
  const weight = parseWeightFromDetails(specifications, description);

  // Seller details
  const shopId = item.shopid || item.shopId || item.shop_id || "";
  const itemId = item.itemid || item.itemId || item.item_id || "";
  const sellerName = item.brand || "Cửa hàng Shopee";
  const sellerUrl = shopId ? `https://shopee.vn/shop/${shopId}` : "https://shopee.vn";

  const sku = item.item_sku || item.itemSku || item.sku || (shopId && itemId ? `SP-${shopId}-${itemId}` : `SP-${itemId || Math.random().toString(36).substring(2, 8).toUpperCase()}`);

  return {
    source: "shopee",
    sourceUrl: fallbackUrl || (shopId && itemId ? `https://shopee.vn/product/${shopId}/${itemId}` : "https://shopee.vn"),
    externalProductId: shopId && itemId ? `${shopId}_${itemId}` : (itemId ? String(itemId) : ""),
    name: item.name || item.title || item.itemName || "Sản phẩm Shopee",
    sku: sku,
    price: price,
    originalPrice: originalPrice,
    description: description,
    images: images,
    variants: variants,
    specifications: specifications,
    seller: {
      name: sellerName,
      shopUrl: sellerUrl
    },
    weight: weight,
    importedAt: new Date().toISOString()
  };
}

function extractJsonFromScriptText(text) {
  const keywordIdx = text.search(/(__PRELOADED_STATE__|__INITIAL_STATE__|price_min)\s*=/);
  let startIdx = -1;
  if (keywordIdx !== -1) {
    startIdx = text.indexOf('{', keywordIdx);
  } else {
    startIdx = text.indexOf('{');
  }
  
  if (startIdx === -1) return null;
  
  const endIdx = text.lastIndexOf('}');
  if (endIdx === -1 || endIdx <= startIdx) return null;
  
  const jsonCandidate = text.substring(startIdx, endIdx + 1);
  
  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    let attempt = jsonCandidate;
    while (attempt.length > 50) {
      try {
        return JSON.parse(attempt);
      } catch (err) {
        const lastBrace = attempt.lastIndexOf('}');
        if (lastBrace === -1) break;
        attempt = attempt.substring(0, lastBrace);
      }
    }
  }
  return null;
}

function getShopeeItemFromPreloadedState(doc = document) {
  // 1. Try by standard IDs
  for (const id of ["preloaded-state-id", "preloaded-state"]) {
    const scriptEl = doc.getElementById(id);
    if (scriptEl) {
      try {
        const parsed = JSON.parse(scriptEl.textContent.trim());
        const item = findNestedItem(parsed);
        if (item && (item.itemid || item.itemId)) {
          return item;
        }
      } catch (e) {
        console.warn(`Failed to parse script ID ${id}:`, e);
      }
    }
  }

  // 2. Try scanning all application/json script tags
  const jsonScripts = doc.querySelectorAll('script[type="application/json"]');
  for (const script of jsonScripts) {
    try {
      const parsed = JSON.parse(script.textContent.trim());
      const item = findNestedItem(parsed);
      if (item && (item.itemid || item.itemId)) {
        return item;
      }
    } catch (e) {}
  }

  // 3. Try scanning all scripts for preloaded patterns
  const scripts = doc.querySelectorAll("script");
  for (const script of scripts) {
    const text = script.textContent || "";
    if (text.includes("__PRELOADED_STATE__") || text.includes("__INITIAL_STATE__") || (text.includes("price_min") && text.includes("tier_variations"))) {
      const parsed = extractJsonFromScriptText(text);
      if (parsed) {
        const item = findNestedItem(parsed);
        if (item && (item.itemid || item.itemId)) {
          return item;
        }
      }
    }
  }
  return null;
}

function findNestedItem(obj) {
  if (!obj || typeof obj !== "object") return null;
  
  const hasItemId = obj.itemid || obj.itemId || obj.item_id || obj.item_id_str;
  const hasPrice = obj.price_min || obj.priceMin || obj.price || obj.price_max || obj.price_before_discount;
  const hasName = obj.name || obj.title || obj.itemName;
  const hasDescription = obj.description || obj.description_info || obj.rich_text_description || obj.extended_description;
  
  if (hasItemId && hasName && (hasPrice || hasDescription)) {
    return obj;
  }
  
  for (const key of Object.keys(obj)) {
    try {
      const val = obj[key];
      if (val && typeof val === "object") {
        const res = findNestedItem(val);
        if (res) return res;
      }
    } catch (e) {}
  }
  return null;
}

async function getProductsFromPage() {
  const isProductPage = window.location.href.match(/i\.(\d+)\.(\d+)/);
  if (isProductPage) {
    const product = await scrapeShopeeProduct();
    return {
      type: "product",
      product: product
    };
  } else {
    const products = [];
    const seen = new Set();
    const anchors = document.querySelectorAll("a[href*='-i.'], a[href*='/i.']");
    
    anchors.forEach(a => {
      let href = a.getAttribute("href");
      if (!href) return;
      
      try {
        const urlObj = new URL(href, window.location.origin);
        const cleanUrl = urlObj.origin + urlObj.pathname;
        const match = cleanUrl.match(/i\.(\d+)\.(\d+)/);
        if (match) {
          const key = `${match[1]}_${match[2]}`;
          if (!seen.has(key)) {
            seen.add(key);
            
            let name = "";
            let img = "";
            
            // 1. Get Image
            const imgEl = a.querySelector("img");
            if (imgEl) {
              img = getImageUrlFromElement(imgEl);
            } else {
              // Try parent container's img
              const parentCard = a.closest("div[class*='item'], div[class*='card']");
              if (parentCard) {
                const siblingImg = parentCard.querySelector("img");
                if (siblingImg) img = getImageUrlFromElement(siblingImg);
              }
            }
            
            // 2. Get Name
            const divElements = a.querySelectorAll("div");
            for (const el of divElements) {
              const txt = el.innerText.trim();
              if (txt && txt.length > 15 && txt.length < 150 && !txt.includes("đ") && !txt.includes("%") && !txt.includes("\n")) {
                name = txt;
                break;
              }
            }
            
            if (!name) {
              name = a.innerText.trim().split("\n")[0].trim();
            }
            
            // Fallback decode URL pathname to get the product name
            if (!name || name.length < 5 || name === "Sản phẩm Shopee") {
              const pathname = decodeURIComponent(urlObj.pathname);
              const namePart = pathname.split("/").pop();
              if (namePart) {
                const cleanPart = namePart.split("-i.")[0];
                name = cleanPart.replace(/-/g, " ").trim();
              }
            }
            
            if (name) name = name.substring(0, 100);

            // 3. Get Price
            let price = null;
            const parentCard = a.closest("div[class*='item'], div[class*='card'], div[class*='product']") || a;
            const potentialPriceElements = parentCard.querySelectorAll("span, div");
            for (const el of potentialPriceElements) {
              const txt = el.innerText.trim();
              if (txt && (txt.includes("đ") || txt.includes("₫")) && txt.length > 1 && txt.length < 35) {
                const val = parseCurrencyText(txt);
                if (val > 1000 && val < 100000000) {
                  price = val;
                  break;
                }
              }
            }
            if (!price) {
              for (const el of potentialPriceElements) {
                const txt = el.innerText.trim();
                // Match patterns like 120.000 or 1.250.000 or 120,000
                if (txt && /^[0-9]{1,3}(?:[.,][0-9]{3})+$/.test(txt)) {
                  const numText = txt.replace(/[^0-9]/g, "");
                  if (numText) {
                    price = parseInt(numText, 10);
                    break;
                  }
                }
              }
            }
            if (!price) {
              const rawText = parentCard.innerText;
              const matchPrice = rawText.match(/(?:đ|₫)?\s*([0-9]{1,3}(?:\.[0-9]{3})+)\s*(?:đ|₫)?/i);
              if (matchPrice) {
                price = parseInt(matchPrice[1].replace(/\./g, ""), 10);
              }
            }
            
            products.push({
              url: cleanUrl,
              shopId: match[1],
              itemId: match[2],
              name: name || "Sản phẩm Shopee",
              image: img || "placeholder.png",
              price: price
            });
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    return {
      type: "list",
      products: products
    };
  }
}

async function extractCompleteProductData(options = {}) {
  const originalUrl = options.originalUrl || options.url || window.location.href;
  const fallbackProduct = buildProductFromListFallback(options.fallbackProduct, originalUrl);
  const currentUrlIsCaptcha = isShopeeCaptchaUrl(window.location.href);

  if (!currentUrlIsCaptcha) {
    await preparePageForDetailedScrape();
  }

  let scraped = currentUrlIsCaptcha ? fallbackProduct : mergeProductData(await scrapeShopeeProduct(document, originalUrl), fallbackProduct);
  if (!scraped) {
    throw new Error("Không thể quét thông tin sản phẩm");
  }

  // Helper to parse IDs from URL inside the function
  const parseIdsFromUrl = (url) => {
    const match = url.match(/i\.(\d+)\.(\d+)/);
    if (match) {
      return {
        shopId: match[1],
        itemId: match[2]
      };
    }
    return { shopId: null, itemId: null };
  };

  const originalUrlIds = parseIdsFromUrl(originalUrl);

  // Ensure itemId and shopId are present.
  let itemId = options.itemId || originalUrlIds.itemId || (scraped.externalProductId ? scraped.externalProductId.split("_")[1] : null);
  let shopId = options.shopId || originalUrlIds.shopId || (scraped.externalProductId ? scraped.externalProductId.split("_")[0] : null);

  if (!itemId || !shopId) {
    // Try to get them from the preloaded state
    try {
      const state = await getShopeeStateFromWindow();
      const preloadedItem = findNestedItem(state);
      if (preloadedItem) {
        itemId = preloadedItem.itemid || preloadedItem.itemId || preloadedItem.item_id || itemId;
        shopId = preloadedItem.shopid || preloadedItem.shopId || preloadedItem.shop_id || shopId;
      }
    } catch (e) {
      console.warn("Failed to get state from window inside extractCompleteProductData:", e);
    }
  }

  if (!itemId || !shopId) {
    // Try from script tags
    const preloadedItem = getShopeeItemFromPreloadedState(document);
    if (preloadedItem) {
      itemId = preloadedItem.itemid || preloadedItem.itemId || preloadedItem.item_id || itemId;
      shopId = preloadedItem.shopid || preloadedItem.shopId || preloadedItem.shop_id || shopId;
    }
  }

  if (!itemId || !shopId) {
    // Try parsing from url
    const urlIds = parseIdsFromUrl(originalUrl);
    itemId = itemId || urlIds.itemId;
    shopId = shopId || urlIds.shopId;
  }

  // Try to find priceMin and priceMax from state or fallback
  let priceMin = null;
  let priceMax = null;
  try {
    const state = await getShopeeStateFromWindow() || getShopeeItemFromPreloadedState(document);
    const itemObj = findNestedItem(state);
    if (itemObj) {
      priceMin = normalizeShopeePrice(itemObj.price_min || itemObj.priceMin);
      priceMax = normalizeShopeePrice(itemObj.price_max || itemObj.priceMax);
    }
  } catch (e) {}

  if (!priceMin) priceMin = scraped.price;
  if (!priceMax) priceMax = scraped.price;

  let apiProduct = null;
  const needsApiFallback = !scraped || !scraped.description || scraped.description.trim().length < 80 || !Array.isArray(scraped.images) || scraped.images.length <= 1;
  if (itemId && shopId && needsApiFallback) {
    try {
      apiProduct = await fetchProductDetailsByApi(itemId, shopId, originalUrl);
    } catch (err) {
      apiProduct = null;
    }
  }

  const completeProduct = mergeProductData(scraped, apiProduct);
  if (!currentUrlIsCaptcha) {
    const domDescription = extractDescriptionFromDom(document);
    if (domDescription && domDescription.length > (completeProduct.description || "").length) {
      completeProduct.description = domDescription;
    }

    const domVariants = extractVariantsFromDom(document);
    if (domVariants.length > (completeProduct.variants || []).length) {
      completeProduct.variants = domVariants;
    }
  }

  if (currentUrlIsCaptcha && (!apiProduct || !completeProduct.description || completeProduct.images.length <= 1)) {
    throw new Error("Shopee đang chuyển tab nền sang trang xác minh captcha, nên không thể lấy mô tả và ảnh chi tiết. Hãy mở sản phẩm Shopee trên tab chính, xác minh nếu Shopee yêu cầu, rồi quét lại chậm hơn.");
  }

  return {
    name: completeProduct.name || "",
    price: completeProduct.price,
    priceMin: priceMin,
    priceMax: priceMax,
    originalPrice: completeProduct.originalPrice,
    images: mergeUniqueStrings((completeProduct.images || []).map(image => toShopeeImageUrl(image) || normalizeShopeeImageUrl(image))).slice(0, 12),
    description: completeProduct.description || "",
    variants: completeProduct.variants || [],
    specifications: completeProduct.specifications || [],
    seller: scraped.seller || { name: "Cửa hàng Shopee", shopUrl: "https://shopee.vn" },
    sourceUrl: isShopeeCaptchaUrl(completeProduct.sourceUrl) ? originalUrl : (completeProduct.sourceUrl || originalUrl),
    itemId: itemId || "",
    shopId: shopId || ""
  };
}

function normalizeDomText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanVariantOptionText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[：:]+$/g, "")
    .trim();
}

function isLikelyVariantOptionText(text, labelText = "") {
  const clean = cleanVariantOptionText(text);
  if (!clean || clean.length > 80) return false;
  const normalized = normalizeDomText(clean);
  const labelNormalized = normalizeDomText(labelText);
  if (labelNormalized && normalized === labelNormalized) return false;
  if (/^(phan loai|so luong|van chuyen|bao hiem|an tam mua|mua ngay|them vao gio hang|con hang|arrow|arrow-down|chevron|dropdown|expand_more)$/i.test(normalized)) return false;
  if (/(danh gia|da ban|to cao|phi ship|tra hang|bao hiem|voucher|kenh nguoi ban|tai ung dung|arrow|chevron|dropdown)/i.test(normalized)) return false;
  if (/^\d+$/.test(normalized)) return false;
  return true;
}

function extractVariantsFromTextBlock(doc = document) {
  const h1 = doc.querySelector("h1");
  let scope = h1 ? h1.parentElement : null;
  for (let i = 0; scope && i < 6; i += 1) {
    const text = normalizeDomText(scope.innerText || scope.textContent || "");
    if (text.includes("so luong") && (text.includes("mau sac") || text.includes("tuy chon") || text.includes("phan loai"))) break;
    scope = scope.parentElement;
  }
  const textSource = scope || doc.body;
  const lines = (textSource.innerText || textSource.textContent || "")
    .split(/\n+/)
    .map(line => cleanVariantOptionText(line))
    .filter(Boolean);

  const labelNames = new Map([
    ["mau sac", "Mau sac"],
    ["tuy chon", "Tuy chon"],
    ["phan loai", "Phan loai"],
    ["kich co", "Kich co"],
    ["size", "Size"]
  ]);
  const stopLabels = /^(so luong|van chuyen|an tam mua|them vao gio hang|mua ngay|danh gia|da ban|to cao|shop)$/i;
  const variants = [];

  for (let i = 0; i < lines.length; i += 1) {
    const normalized = normalizeDomText(lines[i]);
    if (!labelNames.has(normalized)) continue;

    const options = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const optionNormalized = normalizeDomText(lines[j]);
      if (labelNames.has(optionNormalized) || stopLabels.test(optionNormalized)) break;
      if (isLikelyVariantOptionText(lines[j], lines[i]) && !/[₫đvnd]/i.test(lines[j]) && !options.includes(lines[j])) {
        options.push(lines[j]);
      }
      if (options.length >= 20) break;
    }

    if (options.length > 0) {
      variants.push({ name: labelNames.get(normalized) || lines[i], options });
    }
  }

  return variants.slice(0, 3);
}

function extractVariantsFromDom(doc = document) {
  const textBlockVariants = extractVariantsFromTextBlock(doc);
  if (textBlockVariants.length > 0) return textBlockVariants;

  const variants = [];
  const labelPatterns = [
    /phan loai/i,
    /mau sac/i,
    /kich co/i,
    /\bsize\b/i,
    /loai hang/i,
    /kieu/i,
    /model/i,
    /phien ban/i
  ];

  const allNodes = Array.from(doc.querySelectorAll("div, span, label, p"));
  const labels = allNodes.filter(el => {
    const text = cleanVariantOptionText(el.innerText || el.textContent || "");
    if (!text || text.length > 60) return false;
    const normalized = normalizeDomText(text);
    return labelPatterns.some(pattern => pattern.test(normalized));
  });

  labels.forEach(labelEl => {
    const rawLabel = cleanVariantOptionText(labelEl.innerText || labelEl.textContent || "");
    const normalizedLabel = normalizeDomText(rawLabel);
    const variantName = normalizedLabel === "phan loai" ? "Tuy chon" : rawLabel;
    let scope = labelEl.parentElement;
    let options = [];

    for (let level = 0; scope && level < 5 && options.length === 0; level += 1) {
      let candidates = Array.from(scope.querySelectorAll("button, [role='button'], div[class*='variation'], div[class*='Variation'], div[class*='option'], div[class*='Option']"));
      if (candidates.length === 0) {
        candidates = Array.from(scope.querySelectorAll("div")).filter(el => {
          const text = cleanVariantOptionText(el.innerText || el.textContent || "");
          return text && text.length <= 80 && !text.includes("\n");
        });
      }
      options = candidates
        .map(el => cleanVariantOptionText(el.innerText || el.textContent || el.getAttribute("aria-label") || ""))
        .filter(text => isLikelyVariantOptionText(text, rawLabel));

      options = Array.from(new Set(options)).filter(text => {
        const normalized = normalizeDomText(text);
        return !variants.some(variant => variant.options.some(option => normalizeDomText(option) === normalized));
      });

      if (options.length === 0) scope = scope.parentElement;
    }

    if (options.length > 0 && !variants.some(variant => normalizeDomText(variant.name) === normalizeDomText(variantName))) {
      variants.push({
        name: variantName,
        options: options.slice(0, 30)
      });
    }
  });

  return variants.slice(0, 3);
}

async function scrapeShopeeProduct(doc = document, url = window.location.href) {
  // If we are scraping the active tab's document, try to get the hydration state from the main world window object first.
  if (doc === document) {
    try {
      const windowState = await getShopeeStateFromWindow();
      if (windowState) {
        const preloadedItem = findNestedItem(windowState);
        if (preloadedItem) {
          const parsed = parseShopeeItemData(preloadedItem, url);
          if (parsed && parsed.name) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve Shopee state from window context:", err);
    }
  }

  // Try preloaded state from script tag first (Provides full high-res images, description, variants, specifications and original prices)
  const preloadedItem = getShopeeItemFromPreloadedState(doc);
  if (preloadedItem) {
    const parsed = parseShopeeItemData(preloadedItem, url);
    if (parsed && parsed.name) {
      return parsed;
    }
  }

  const result = {
    source: "shopee",
    sourceUrl: url,
    externalProductId: getExternalProductId(url),
    name: "",
    sku: "",
    price: null,
    originalPrice: null,
    description: "",
    images: [],
    variants: [],
    specifications: [],
    seller: {
      name: "",
      shopUrl: ""
    },
    importedAt: new Date().toISOString()
  };

  // --- STRATEGY 1: JSON-LD (Highly accurate if available) ---
  const jsonLdData = getJsonLdData(doc);
  if (jsonLdData) {
    if (jsonLdData.name) result.name = jsonLdData.name;
    if (jsonLdData.description) result.description = jsonLdData.description;
    if (jsonLdData.image) {
      result.images = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
    }
    if (jsonLdData.offers) {
      const offers = Array.isArray(jsonLdData.offers) ? jsonLdData.offers[0] : jsonLdData.offers;
      if (offers && offers.price) {
        result.price = parseFloat(offers.price);
      }
    }
    if (jsonLdData.sku) {
      result.sku = jsonLdData.sku;
    }
  }

  // --- STRATEGY 2: META TAGS (Fallback) ---
  if (!result.name) {
    result.name = getMetaValue(doc, "og:title") || getMetaValue(doc, "twitter:title") || doc.title;
    // Clean up " | Shopee Việt Nam" or " | Shopee" if present
    if (result.name) {
      result.name = result.name.replace(/\s*\|\s*Shopee\s*(Việt Nam)?/gi, "").trim();
    }
  }

  if (result.images.length === 0) {
    const ogImg = getMetaValue(doc, "og:image") || getMetaValue(doc, "twitter:image");
    if (ogImg) result.images.push(ogImg);
  }

  if (!result.description) {
    result.description = getMetaValue(doc, "og:description") || getMetaValue(doc, "description") || "";
  }

  if (result.price === null) {
    const metaPrice = getMetaValue(doc, "product:price:amount");
    if (metaPrice) result.price = parseFloat(metaPrice);
  }

  // --- STRATEGY 3: DOM SCRAPING FOR DETAIL DATA ---

  // 1. Scraping product name from DOM if still empty
  if (!result.name) {
    const h1El = doc.querySelector("h1, .product-briefing h1, div[style*='font-size: 1.25rem']");
    if (h1El) result.name = h1El.innerText.trim();
  }

  // 2. Scraping Prices (Active and Original Price)
  if (result.price === null) {
    // Look for classes containing price on Shopee
    const priceElements = doc.querySelectorAll(".pq666N, div[style*='font-size: 1.875rem'], div[style*='font-size: 1.5rem'], div[style*='font-size: 2rem'], .G2799Z, ._2v0gS, ._3n5_q, div[class*='price'], span[class*='price'], div[class*='Price'], span[class*='Price'], .product-price, .price");
    for (const el of priceElements) {
      const parsedPrice = parseCurrencyText(el.innerText);
      if (parsedPrice) {
        result.price = parsedPrice;
        break;
      }
    }
  }

  // Scraping Original Price (the struck-through old price)
  const originalPriceEl = doc.querySelector(".X087bO, ._17983O, del, span[style*='text-decoration: line-through'], div[style*='text-decoration: line-through'], span[class*='original'], div[class*='original'], span[class*='originalPrice'], div[class*='originalPrice']");
  if (originalPriceEl) {
    result.originalPrice = parseCurrencyText(originalPriceEl.innerText);
  }

  // If original price is empty or less than price, fix it
  if (result.originalPrice && result.price && result.originalPrice <= result.price) {
    result.originalPrice = null;
  }

  // 3. Scraping Images from product gallery only. Do not scan the whole page,
  // because Shopee recommendation images appear below the detail page.
  const galleryImages = collectCurrentProductGalleryImages(doc);
  const primedGalleryImages = doc === document && Array.isArray(window.__voltaraGalleryImages) ? window.__voltaraGalleryImages : [];
  const finalGalleryImages = mergeUniqueStrings(primedGalleryImages, galleryImages).slice(0, 12);
  if (finalGalleryImages.length > 0) {
    result.images = finalGalleryImages;
  } else {
    result.images = (result.images || []).slice(0, 12);
  }

  // 4. Shop info (Seller)
  const shopNameEl = doc.querySelector(".official-store-brand-name, ._3u97Yl, ._1WJ-R0, .v9Z9XJ, a[href*='/shop/'], div[class*='shop-name']");
  if (shopNameEl) {
    result.seller.name = shopNameEl.innerText.trim();
  } else {
    // Try to find any shop link element
    const profileSection = doc.querySelector("div[class*='shop-profile']");
    if (profileSection) {
      const nameEl = profileSection.querySelector("h1, h2, h3, div");
      if (nameEl) result.seller.name = nameEl.innerText.trim();
    }
  }

  // Generate Seller Shop Url based on username if found, or generic fallback
  const shopAnchor = doc.querySelector("a[href*='/shop/'], a[href^='/']");
  if (shopAnchor) {
    const href = shopAnchor.getAttribute("href");
    if (href && (href.includes("/shop/") || href.split("/").length === 2)) {
      result.seller.shopUrl = href.startsWith("http") ? href : `https://shopee.vn${href}`;
    }
  }
  
  if (!result.seller.name) {
    result.seller.name = "Cửa hàng Shopee";
  }
  if (!result.seller.shopUrl) {
    result.seller.shopUrl = "https://shopee.vn";
  }

  // 5. Variants (Product Options)
  const variantSections = doc.querySelectorAll("div[class*='product-variation'], div[class*='variation-container'], div[class*='specification-row']");
  if (variantSections.length > 0) {
    variantSections.forEach(section => {
      // Find label
      const labelEl = section.querySelector("label, ._1z1X0P, span, h3");
      if (labelEl) {
        const labelText = labelEl.innerText.replace(/[:：]/g, "").trim();
        // Check if options are inside buttons
        const optionButtons = section.querySelectorAll("button:not([disabled]), .product-variation, ._2O0S_W");
        if (optionButtons.length > 0 && labelText && !["số lượng", "vận chuyển", "mã giảm giá"].includes(labelText.toLowerCase())) {
          const options = [];
          optionButtons.forEach(btn => {
            const optText = btn.innerText.trim();
            if (optText && !options.includes(optText)) {
              options.push(optText);
            }
          });
          if (options.length > 0) {
            result.variants.push({
              name: labelText,
              options: options
            });
          }
        }
      }
    });
  }

  // Alternative variant scraper (looking for headings + button list siblings)
  if (result.variants.length === 0) {
    // Look for items with option-like layouts
    const headers = doc.querySelectorAll("h3, div[class*='label'], div[class*='title']");
    headers.forEach(h => {
      const title = h.innerText.replace(/[:：]/g, "").trim();
      if (title && (title.toLowerCase().includes("màu") || title.toLowerCase().includes("size") || title.toLowerCase().includes("loại") || title.toLowerCase().includes("phiên bản"))) {
        const parent = h.parentElement;
        if (parent) {
          const btns = parent.querySelectorAll("button, div[class*='btn'], div[class*='item']");
          const options = [];
          btns.forEach(b => {
            const txt = b.innerText.trim();
            if (txt && txt.length < 50 && b !== h && !options.includes(txt)) {
              options.push(txt);
            }
          });
          if (options.length > 0) {
            result.variants.push({ name: title, options: options });
          }
        }
      }
    });
  }

  // 6. Specifications (Thông tin chi tiết)
  const domVariants = extractVariantsFromDom(doc);
  if (domVariants.length > result.variants.length) {
    result.variants = domVariants;
  }

  const specRows = doc.querySelectorAll("div[class*='product-detail'], div[class*='attribute'], ._3g8hG-, ._3vSsh2, .rY_6P0, doc-specification, div[class*='specification']");
  if (specRows.length > 0) {
    specRows.forEach(row => {
      const labelEl = row.querySelector("label, ._2H_b78, span:first-child, div:first-child");
      const valEl = row.querySelector("div:last-child, span:last-child, a");
      if (labelEl && valEl && labelEl !== valEl) {
        const name = labelEl.innerText.replace(/[:：]/g, "").trim();
        const value = valEl.innerText.trim();
        if (name && value && name.length < 100 && value.length < 500 && !["danh mục", "kho", "gửi từ"].includes(name.toLowerCase())) {
          result.specifications.push({ name, value });
        }
      }
    });
  }

  // Fallback description collection from DOM if default is short/missing
  if (!result.description || result.description.length < 100) {
    const descSection = doc.querySelector(".product-detail, ._3-_Lp3, div[style*='white-space: pre-wrap'], div[class*='description']");
    if (descSection) {
      result.description = descSection.innerText.trim();
    }
  }

  // Standardize some product fields
  if (result.name) result.name = result.name.substring(0, 255);
  if (result.sku) result.sku = result.sku.substring(0, 100);
  if (result.description) result.description = result.description.substring(0, 15000);
  result.images = mergeUniqueStrings(result.images.map(image => toShopeeImageUrl(image) || normalizeShopeeImageUrl(image))).slice(0, 12);

  // 7. Parse and assign weight (Vietnamese shipping requirement)
  result.weight = parseWeightFromDetails(result.specifications, result.description);

  return result;
}

// Helpers
function getMetaValue(doc, nameOrProperty) {
  const el = doc.querySelector(`meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`);
  return el ? el.getAttribute("content") : null;
}

function getJsonLdData(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.innerText);
      if (parsed["@type"] === "Product" || (Array.isArray(parsed) && parsed.find(item => item["@type"] === "Product"))) {
        return Array.isArray(parsed) ? parsed.find(item => item["@type"] === "Product") : parsed;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  return null;
}

function getExternalProductId(url) {
  const match = url.match(/i\.(\d+)\.(\d+)/);
  if (match) {
    return `${match[1]}_${match[2]}`;
  }
  
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    const productId = params.get("productId") || params.get("spid");
    if (productId) return productId;
  } catch (e) {}

  return "shopee_" + Math.random().toString(36).substring(2, 8);
}

// Smart filter to identify and exclude unwanted icons/logos/avatars from Shopee scraping
function isCleanProductImage(img) {
  const src = getImageUrlFromElement(img);
  const alt = (img.getAttribute("alt") || "").toLowerCase();
  const className = (img.getAttribute("class") || "").toLowerCase();
  
  if (!src || !src.startsWith("http")) return false;
  
  // 1. Exclude obvious small icons/badges/logos by URL keywords
  const unwantedKeywords = [
    "star", "rating", "badge", "icon", "logo", "avatar", "shield", "check", "truck", "shipping", "payment",
    "mall", "shopee-svg", "voucher", "free-shipping", "extra", "coin", "heart", "like", "favorite", "arrow",
    "chevron", "play", "close", "minimize", "maximize", "social", "facebook", "tiktok", "messenger", "zalo",
    "instagram", "youtube", "twitter", "pinterest", "care-badge", "guarantee"
  ];
  
  const lowerSrc = src.toLowerCase();
  if (unwantedKeywords.some(keyword => lowerSrc.includes(keyword))) {
    return false;
  }
  
  // 2. Exclude by alt attribute keywords
  const unwantedAlt = [
    "star", "rating", "badge", "icon", "logo", "avatar", "shield", "check", "truck", "shipping", "payment",
    "mall", "voucher", "free-shipping", "like", "favorite", "arrow", "chevron", "zalo", "facebook",
    "cửa hàng", "shop", "avatar của", "mặt hàng", "vận chuyển", "bảo hành"
  ];
  if (unwantedAlt.some(keyword => alt.includes(keyword))) {
    return false;
  }
  
  // 3. Exclude by class name keywords
  const unwantedClass = ["avatar", "logo", "icon", "star", "badge", "shield", "nav", "header", "footer", "sidebar", "menu", "comment"];
  if (unwantedClass.some(keyword => className.includes(keyword))) {
    return false;
  }
  
  // 4. Exclude if parent has an unwanted class
  const parent = img.parentElement;
  if (parent) {
    const parentClass = (parent.getAttribute("class") || "").toLowerCase();
    if (unwantedClass.some(keyword => parentClass.includes(keyword))) {
      return false;
    }
  }
  
  // 5. Check if it's inside an unwanted section like comments / review section / shop profile / recommended products
  const closestUnwanted = img.closest("div[class*='shop-profile'], div[class*='comment'], div[class*='review'], div[class*='recommend'], div[class*='footer']");
  if (closestUnwanted) {
    return false;
  }

  return true;
}

// Regex parser to extract product weight in grams (defaulting to 500g)
function parseWeightFromDetails(specifications, description) {
  // Check specifications first
  if (specifications && Array.isArray(specifications)) {
    for (const spec of specifications) {
      const nameLower = spec.name.toLowerCase();
      if (nameLower.includes("cân nặng") || nameLower.includes("trọng lượng") || nameLower.includes("khối lượng") || nameLower.includes("weight")) {
        const valLower = spec.value.toLowerCase();
        // Try to extract numbers and units (kg vs g)
        const numMatch = valLower.match(/([0-9.,]+)\s*(kg|g|gam|kgm|gr)/);
        if (numMatch) {
          let val = parseFloat(numMatch[1].replace(",", "."));
          const unit = numMatch[2];
          if (unit.startsWith("k")) {
            return Math.round(val * 1000); // convert kg to g
          } else {
            return Math.round(val);
          }
        }
        
        // Just extract first number if no clear unit
        const simpleNum = valLower.match(/([0-9.,]+)/);
        if (simpleNum) {
          let val = parseFloat(simpleNum[1].replace(",", "."));
          // If it's less than 20, it's likely in kg, convert to g
          if (val < 20) {
            return Math.round(val * 1000);
          }
          return Math.round(val);
        }
      }
    }
  }

  // Check description
  if (description) {
    const descLower = description.toLowerCase();
    const weightPatterns = [
      /(?:cân nặng|trọng lượng|khối lượng|nặng|weight)\s*(?:khoảng|tầm|:|)\s*([0-9.,]+)\s*(kg|g|gam|gr)/,
      /([0-9.,]+)\s*(kg|g|gam|gr)\s*(?:cân nặng|trọng lượng|khối lượng|nặng|weight)/,
      /trọng lượng\s*([0-9.,]+)\s*(kg|g|gam|gr)/,
      /cân nặng\s*([0-9.,]+)\s*(kg|g|gam|gr)/
    ];
    
    for (const pattern of weightPatterns) {
      const match = descLower.match(pattern);
      if (match) {
        let val = parseFloat(match[1].replace(",", "."));
        const unit = match[2];
        if (unit.startsWith("k")) {
          return Math.round(val * 1000);
        } else {
          return Math.round(val);
        }
      }
    }
  }

  return 500; // Default to 500g as requested
}

let isFbQueueRunning = false;

// Persistent in-page toolbar, similar to marketplace copy tools. This avoids the
// browser popup closing when the user clicks outside of it.
function initVoltaraInlineTools() {
  if (window.__voltaraInlineToolsInstalled) return;
  window.__voltaraInlineToolsInstalled = true;

  if (window.location.hostname.includes("facebook.com")) {
    initVoltaraFacebookInlineTools();
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    #voltara-inline-panel {
      position: fixed;
      left: 12px;
      bottom: 16px;
      z-index: 2147483647;
      width: 278px;
      background: #101419;
      color: #e5edf8;
      border: 1px solid #2563eb;
      border-radius: 8px;
      box-shadow: 0 14px 36px rgba(0,0,0,.35);
      font-family: Arial, sans-serif;
      overflow: hidden;
    }
    #voltara-inline-panel.voltara-hidden { display: none !important; }
    #voltara-inline-launcher {
      position: fixed;
      left: 12px;
      bottom: 16px;
      z-index: 2147483647;
      display: none;
      width: 38px;
      height: 38px;
      align-items: center;
      justify-content: center;
      border: 1px solid #2563eb;
      border-radius: 9px;
      background: #0b1220;
      color: #ffffff;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      cursor: pointer;
      font: 800 16px/1 Arial, sans-serif;
    }
    #voltara-inline-launcher.voltara-visible { display: flex; }
    .voltara-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 10px;
      background: #0b1220;
      border-bottom: 1px solid rgba(37,99,235,.45);
      font-weight: 700;
      font-size: 13px;
    }
    .voltara-panel-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 10px;
    }
    .voltara-panel-btn, .voltara-copy-card-btn {
      border: 1px solid #2563eb;
      background: #1d4ed8;
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
    }
    .voltara-panel-btn { padding: 9px 8px; }
    .voltara-panel-btn.secondary { background: transparent; color: #bfdbfe; }
    .voltara-panel-status {
      padding: 0 10px 10px;
      min-height: 18px;
      color: #a9b8cc;
      font-size: 11px;
      line-height: 1.35;
    }
    .voltara-panel-toggle {
      border: 0;
      background: transparent;
      color: #9fb7ff;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    .voltara-copy-card-btn {
      position: absolute;
      left: 8px;
      bottom: 8px;
      z-index: 50;
      padding: 7px 10px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 5px 14px rgba(0,0,0,.3);
    }
    .voltara-copy-card-btn[disabled] {
      opacity: .7;
      cursor: wait;
    }
  `;
  document.documentElement.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "voltara-inline-panel";
  panel.innerHTML = `
    <div class="voltara-panel-head">
      <span>Voltara Copy</span>
      <button class="voltara-panel-toggle" type="button" title="Ẩn bảng điều khiển" aria-label="Ẩn bảng điều khiển">−</button>
    </div>
    <div class="voltara-panel-body">
      <div class="voltara-panel-actions">
        <button class="voltara-panel-btn" type="button" data-action="copy-current">Copy trang này</button>
        <button class="voltara-panel-btn secondary" type="button" data-action="scan">Gắn nút Copy</button>
      </div>
      <div class="voltara-panel-status">Sẵn sàng trên Shopee.</div>
    </div>
  `;
  document.body.appendChild(panel);

  const launcher = document.createElement("button");
  launcher.id = "voltara-inline-launcher";
  launcher.type = "button";
  launcher.title = "Mở Voltara Copy";
  launcher.setAttribute("aria-label", "Mở Voltara Copy");
  launcher.textContent = "V";
  document.body.appendChild(launcher);

  const actionsEl = panel.querySelector(".voltara-panel-actions");
  if (actionsEl && !actionsEl.querySelector("[data-action='copy-visible']")) {
    const copyVisibleBtn = document.createElement("button");
    copyVisibleBtn.className = "voltara-panel-btn";
    copyVisibleBtn.type = "button";
    copyVisibleBtn.dataset.action = "copy-visible";
    copyVisibleBtn.textContent = "Copy toan trang";
    actionsEl.appendChild(copyVisibleBtn);

    const stopQueueBtn = document.createElement("button");
    stopQueueBtn.className = "voltara-panel-btn secondary";
    stopQueueBtn.type = "button";
    stopQueueBtn.dataset.action = "stop-queue";
    stopQueueBtn.textContent = "Dung";
    actionsEl.appendChild(stopQueueBtn);
  }

  const statusEl = panel.querySelector(".voltara-panel-status");
  const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
  };

  const panelVisibilityKey = "voltara_inline_panel_hidden";
  const setPanelHidden = (hidden, persist = true) => {
    panel.classList.toggle("voltara-hidden", hidden);
    launcher.classList.toggle("voltara-visible", hidden);
    if (persist && chrome?.storage?.local) {
      chrome.storage.local.set({ [panelVisibilityKey]: hidden });
    }
  };

  panel.querySelector(".voltara-panel-toggle")?.addEventListener("click", () => {
    setPanelHidden(true);
  });
  launcher.addEventListener("click", () => setPanelHidden(false));
  if (chrome?.storage?.local) {
    chrome.storage.local.get(panelVisibilityKey, (result) => {
      setPanelHidden(result?.[panelVisibilityKey] === true, false);
    });
  }

  panel.querySelector("[data-action='scan']")?.addEventListener("click", () => {
    const count = injectVoltaraCopyButtons(setStatus);
    setStatus(`Đã gắn ${count} nút Copy trên trang.`);
  });

  panel.querySelector("[data-action='copy-visible']")?.addEventListener("click", async () => {
    const products = collectVisibleVoltaraProducts();
    if (products.length === 0) {
      setStatus("Khong tim thay san pham tren trang.");
      return;
    }
    await startVoltaraVisibleQueue(products, window.location.href);
  });

  panel.querySelector("[data-action='stop-queue']")?.addEventListener("click", async () => {
    await clearVoltaraQueue();
    setStatus("Da dung hang doi copy.");
  });

  panel.querySelector("[data-action='copy-current']")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    setStatus("Đang copy sản phẩm hiện tại...");
    try {
      const data = await extractCompleteProductData({ originalUrl: window.location.href });
      await importVoltaraProduct(data);
      setStatus(`Đã gửi: ${data.name || "sản phẩm"}`);
    } catch (err) {
      setStatus(err?.message || "Không copy được sản phẩm hiện tại.");
    } finally {
      btn.disabled = false;
    }
  });

  injectVoltaraCopyButtons(setStatus);
  const observer = new MutationObserver(() => injectVoltaraCopyButtons(setStatus));
  observer.observe(document.body, { childList: true, subtree: true });
  resumeVoltaraQueueIfNeeded(setStatus);
}

function injectVoltaraCopyButtons(setStatus) {
  const anchors = Array.from(document.querySelectorAll("a[href*='-i.'], a[href*='/i.']"));
  let added = 0;

  anchors.forEach(anchor => {
    if (anchor.dataset.voltaraCopyAttached === "1") return;
    const product = parseVoltaraProductAnchor(anchor);
    if (!product) return;

    const card = anchor.closest("div[class*='item'], div[class*='card'], div[class*='product'], li") || anchor;
    if (!card || card.querySelector(".voltara-copy-card-btn")) return;
    anchor.dataset.voltaraCopyAttached = "1";

    const currentPosition = getComputedStyle(card).position;
    if (currentPosition === "static") {
      card.style.position = "relative";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "voltara-copy-card-btn";
    btn.textContent = "+ Copy";
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled = true;
      btn.textContent = "Đang copy";
      setStatus?.(`Đang copy: ${product.name || product.itemId}`);
      try {
        await startVoltaraVisibleQueue([product], window.location.href);
        return;
        const data = await copyVoltaraProductFromCard(product);
        setStatus?.(`Đã gửi: ${data.name || product.name}`);
        btn.textContent = "Đã copy";
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = "+ Copy";
        }, 1600);
      } catch (err) {
        setStatus?.(err?.message || "Copy sản phẩm thất bại.");
        btn.disabled = false;
        btn.textContent = "+ Copy";
      }
    });

    card.appendChild(btn);
    added += 1;
  });

  return added;
}

function collectVisibleVoltaraProducts() {
  const byKey = new Map();
  const anchors = Array.from(document.querySelectorAll("a[href*='-i.'], a[href*='/i.']"));
  anchors.forEach(anchor => {
    const product = parseVoltaraProductAnchor(anchor);
    if (!product) return;
    const key = `${product.shopId}_${product.itemId}`;
    if (!byKey.has(key)) byKey.set(key, product);
  });
  return Array.from(byKey.values());
}

function getVoltaraQueue() {
  return new Promise(resolve => {
    chrome.storage.local.get("voltaraCurrentTabQueue", result => {
      resolve(result.voltaraCurrentTabQueue || null);
    });
  });
}

function setVoltaraQueue(queue) {
  return new Promise(resolve => {
    chrome.storage.local.set({ voltaraCurrentTabQueue: queue }, resolve);
  });
}

function clearVoltaraQueue() {
  return new Promise(resolve => {
    chrome.storage.local.remove("voltaraCurrentTabQueue", resolve);
  });
}

async function startVoltaraVisibleQueue(products, returnUrl) {
  const queue = {
    active: true,
    returnUrl,
    index: 0,
    products,
    startedAt: Date.now()
  };
  await setVoltaraQueue(queue);
  window.location.href = products[0].url;
}

async function resumeVoltaraQueueIfNeeded(setStatus) {
  const queue = await getVoltaraQueue();
  if (!queue?.active || !Array.isArray(queue.products) || queue.products.length === 0) return;

  const current = queue.products[queue.index];
  if (!current) {
    await finishVoltaraQueue(queue, setStatus);
    return;
  }

  const currentKey = getExternalProductId(window.location.href);
  const expectedKey = current.shopId && current.itemId ? `${current.shopId}_${current.itemId}` : "";
  if (!expectedKey || currentKey !== expectedKey) {
    setStatus?.(`Dang mo san pham ${queue.index + 1}/${queue.products.length}...`);
    window.location.href = current.url;
    return;
  }

  setStatus?.(`Dang copy ${queue.index + 1}/${queue.products.length}: ${current.name || current.itemId}`);

  try {
    await wait(1800);
    const detail = await extractCompleteProductData({
      originalUrl: current.url,
      itemId: current.itemId,
      shopId: current.shopId,
      fallbackProduct: current
    });
    if ((!detail.price || detail.price <= 0) && current.price) detail.price = current.price;
    if ((!detail.images || detail.images.length === 0) && current.image) detail.images = [current.image];
    if (!detail.name && current.name) detail.name = current.name;
    await importVoltaraProduct(detail);
    setStatus?.(`Da gui ${queue.index + 1}/${queue.products.length}: ${detail.name || current.name}`);
  } catch (err) {
    setStatus?.(`Loi ${queue.index + 1}/${queue.products.length}: ${err?.message || "khong copy duoc"}`);
  }

  queue.index += 1;
  await setVoltaraQueue(queue);

  if (queue.index >= queue.products.length) {
    await finishVoltaraQueue(queue, setStatus);
  } else {
    setTimeout(() => {
      window.location.href = queue.products[queue.index].url;
    }, 900);
  }
}

async function finishVoltaraQueue(queue, setStatus) {
  await clearVoltaraQueue();
  setStatus?.(`Hoan tat ${queue.products.length} san pham.`);
  if (queue.returnUrl && !isShopeeCaptchaUrl(queue.returnUrl)) {
    setTimeout(() => {
      window.location.href = queue.returnUrl;
    }, 1200);
  }
}

function parseVoltaraProductAnchor(anchor) {
  const href = anchor.getAttribute("href");
  if (!href) return null;

  let urlObj;
  try {
    urlObj = new URL(href, window.location.origin);
  } catch (e) {
    return null;
  }

  const cleanUrl = urlObj.origin + urlObj.pathname;
  const match = cleanUrl.match(/i\.(\d+)\.(\d+)/);
  if (!match) return null;

  const card = anchor.closest("div[class*='item'], div[class*='card'], div[class*='product'], li") || anchor;
  const imgEl = anchor.querySelector("img") || card.querySelector("img");
  const image = imgEl ? getImageUrlFromElement(imgEl) : "";
  const rawText = card.innerText || anchor.innerText || "";
  const price = parseCurrencyText(rawText);

  let name = "";
  const textLines = rawText.split("\n").map(line => line.trim()).filter(Boolean);
  name = textLines.find(line => line.length > 12 && line.length < 180 && !line.includes("%") && !line.match(/[0-9][.,][0-9]{3}/)) || "";
  if (!name) {
    const namePart = decodeURIComponent(urlObj.pathname).split("/").pop()?.split("-i.")[0] || "";
    name = namePart.replace(/-/g, " ").trim();
  }

  return {
    url: cleanUrl,
    shopId: match[1],
    itemId: match[2],
    name: name.substring(0, 180),
    image,
    price
  };
}

async function copyVoltaraProductFromCard(product) {
  let detail = null;
  try {
    detail = await fetchProductDetailsByApi(product.itemId, product.shopId, product.url);
  } catch (err) {
    detail = buildProductFromListFallback(product, product.url);
  }

  if (!detail) {
    detail = buildProductFromListFallback(product, product.url);
  }

  if (!detail.name && product.name) {
    detail.name = product.name;
  }
  detail.sourceUrl = product.url;
  detail.externalProductId = product.shopId && product.itemId ? `${product.shopId}_${product.itemId}` : detail.externalProductId;
  if ((!detail.images || detail.images.length === 0) && product.image) {
    detail.images = [product.image];
  }
  if ((!detail.price || detail.price <= 0) && product.price) {
    detail.price = product.price;
  }
  if (!detail.sku && detail.externalProductId) {
    detail.sku = `SP-${detail.externalProductId}`;
  }

  await importVoltaraProduct(detail);
  return detail;
}

function importVoltaraProduct(productData) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "IMPORT_PRODUCT",
      productData
    }, (res) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message || "";
        if (msg.includes("invalidated") || msg.includes("disconnected") || msg.includes("context")) {
          reject(new Error("Lỗi kết nối tiện ích. Tiện ích Voltara vừa được cập nhật hoặc cài đặt mới. Bạn hãy bấm F5 để tải lại trang web này trước khi tiếp tục sao chép."));
        } else {
          reject(new Error(msg));
        }
        return;
      }
      if (res?.success) {
        resolve(res);
      } else {
        reject(new Error(res?.error || "Không gửi được sản phẩm về Voltara Hub."));
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVoltaraInlineTools, { once: true });
} else {
  initVoltaraInlineTools();
}

async function scrapeFacebookPost() {
  console.log("[Voltara Scraper] Scraping Facebook post via modern parser...");
  const parser = window.VoltaraFacebookParser;
  if (!parser) {
    throw new Error("Hệ thống phân tích bài viết Voltara chưa được tải hoàn toàn. Vui lòng tải lại trang (F5) để kích hoạt.");
  }

  const mainPost = parser.detector.getMainFacebookPostOnPage();
  if (mainPost) {
    console.log("[Voltara Scraper] Found main post element on page. Scraping within it.");
    if (mainPost.querySelector("video")) {
      await prepareFacebookVideoForQueue();
    }
    const postData = await parser.parseFacebookPost(mainPost);
    return await enrichFacebookVideoUrls(postData);
  }

  // Absolutely NO fallback to document.body!
  throw new Error("Không xác định được bài viết Facebook. Hãy mở bài viết riêng biệt hoặc bấm nút Copy trực tiếp trên bài viết.");
}

function requestFacebookDirectVideoUrls() {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({
        type: "GET_FACEBOOK_VIDEO_URLS",
        notBefore: Math.max(
          Number(window.__voltaraFacebookVideoNotBefore) || 0,
          Math.floor(performance.timeOrigin || 0)
        )
      }, response => {
        if (chrome.runtime.lastError || !response?.success || !Array.isArray(response.urls)) {
          resolve([]);
          return;
        }
        resolve(response.urls);
      });
    } catch (_) {
      resolve([]);
    }
  });
}

async function enrichFacebookVideoUrls(postData) {
  const videoItems = Array.isArray(postData?.media)
    ? postData.media.filter(item => item?.type === "video")
    : [];
  if (!videoItems.length) return postData;

  let candidates = await requestFacebookDirectVideoUrls();
  let muxedCandidates = candidates.filter(candidate => candidate?.hasVideoTrack && candidate?.hasAudioTrack);
  let videoCandidates = candidates.filter(candidate => candidate?.hasVideoTrack && !candidate?.hasAudioTrack);
  let audioCandidates = candidates.filter(candidate => !candidate?.hasVideoTrack && candidate?.hasAudioTrack);
  if (!muxedCandidates.length && (!videoCandidates.length || !audioCandidates.length)) {
    await prepareFacebookVideoForQueue();
    await new Promise(resolve => setTimeout(resolve, 1200));
    candidates = await requestFacebookDirectVideoUrls();
    muxedCandidates = candidates.filter(candidate => candidate?.hasVideoTrack && candidate?.hasAudioTrack);
    videoCandidates = candidates.filter(candidate => candidate?.hasVideoTrack && !candidate?.hasAudioTrack);
    audioCandidates = candidates.filter(candidate => !candidate?.hasVideoTrack && candidate?.hasAudioTrack);
  }
  if (!muxedCandidates.length && (!videoCandidates.length || !audioCandidates.length)) {
    throw new Error("Chưa bắt đủ luồng hình và tiếng của Reel. Hãy bấm F5 trang Facebook, cho video chạy 2 giây rồi Copy lại.");
  }

  const used = new Set();
  videoItems.forEach((item, index) => {
    const hasDashPair = videoCandidates.length > 0 && audioCandidates.length > 0;
    const candidate = hasDashPair
      ? (videoCandidates.find(entry => !used.has(entry.url)) || videoCandidates[index] || videoCandidates[0])
      : (muxedCandidates.find(entry => !used.has(entry.url)) || muxedCandidates[index] || muxedCandidates[0]);
    if (!candidate?.url) return;
    used.add(candidate.url);
    item.url = candidate.url;
    if (!candidate.hasAudioTrack) {
      const audioCandidate = audioCandidates[index] || audioCandidates[0];
      item.audioUrl = audioCandidate?.url || "";
      item.videoUrlType = "dash-pair";
    } else {
      delete item.audioUrl;
      item.videoUrlType = "direct-muxed";
    }
    item.quality = candidate.quality || "facebook-cdn";
    delete item.message;
  });
  return postData;
}

function importVoltaraFacebookPost(postData) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "IMPORT_FACEBOOK_POST",
      postData
    }, (res) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message || "";
        if (msg.includes("invalidated") || msg.includes("disconnected") || msg.includes("context")) {
          reject(new Error("Lỗi kết nối tiện ích. Tiện ích Voltara vừa được cập nhật hoặc cài đặt mới. Bạn hãy bấm F5 (tải lại trang Facebook) để kích hoạt lại toàn bộ tính năng tự động copy."));
        } else {
          reject(new Error(msg));
        }
        return;
      }
      if (res?.success) {
        resolve(res);
      } else {
        reject(new Error(res?.error || "Không gửi được bài viết về Voltara Hub."));
      }
    });
  });
}

function isActualFacebookPost(el) {
  return (window.VoltaraFacebookParser?.detector?.scoreFacebookPostArticle(el) || 0) >= 30;
}

function findFacebookPostsOnPage() {
  return window.VoltaraFacebookParser?.detector?.findFacebookPostsOnPage() || [];
}

function getMainFacebookPostOnPage() {
  return window.VoltaraFacebookParser?.detector?.getMainFacebookPostOnPage() || null;
}

async function extractFacebookPostData(art) {
  const parser = window.VoltaraFacebookParser;
  if (!parser) {
    throw new Error("Hệ thống phân tích bài viết Voltara chưa được tải hoàn toàn. Vui lòng tải lại trang (F5) để kích hoạt.");
  }
  const postData = await parser.parseFacebookPost(art);
  return await enrichFacebookVideoUrls(postData);
}

function initVoltaraFacebookInlineTools() {
  const style = document.createElement("style");
  style.textContent = `
    #voltara-fb-inline-panel {
      position: fixed;
      left: 12px;
      bottom: 16px;
      z-index: 2147483647;
      width: 278px;
      background: #1877f2;
      color: #ffffff;
      border: 1px solid #145dbf;
      border-radius: 8px;
      box-shadow: 0 14px 36px rgba(0,0,0,.35);
      font-family: Arial, sans-serif;
      overflow: hidden;
    }
    #voltara-fb-inline-panel.voltara-hidden { display: none !important; }
    #voltara-fb-inline-launcher {
      position: fixed;
      left: 12px;
      bottom: 16px;
      z-index: 2147483647;
      display: none;
      width: 38px;
      height: 38px;
      align-items: center;
      justify-content: center;
      border: 1px solid #145dbf;
      border-radius: 9px;
      background: #1877f2;
      color: #ffffff;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      cursor: pointer;
      font: 800 16px/1 Arial, sans-serif;
    }
    #voltara-fb-inline-launcher.voltara-visible { display: flex; }
    
    .voltara-fb-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 10px;
      background: #0e56b3;
      border-bottom: 1px solid rgba(255,255,255,.2);
      font-weight: 700;
      font-size: 13px;
    }
    
    .voltara-fb-panel-body {
      background: #101419;
      color: #e5edf8;
    }
    
    .voltara-fb-panel-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 10px;
    }
    
    .voltara-fb-panel-btn {
      border: 1px solid #1877f2;
      background: #1877f2;
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      padding: 9px 8px;
      text-align: center;
    }
    
    .voltara-fb-panel-btn.secondary { 
      background: transparent; 
      color: #60a5fa; 
      border-color: #3b82f6;
    }
    
    .voltara-fb-panel-status {
      padding: 0 10px 10px;
      min-height: 18px;
      color: #a9b8cc;
      font-size: 11px;
      line-height: 1.35;
    }
    
    .voltara-fb-panel-toggle {
      border: 0;
      background: transparent;
      color: #ffffff;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    
    .voltara-fb-post-copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 9999;
      background: #1877f2;
      color: white;
      border: 1px solid #145dbf;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: background 0.2s;
    }
    
    .voltara-fb-post-copy-btn:hover {
      background: #1565c0;
    }
    
    .voltara-fb-post-copy-btn[disabled] {
      opacity: .7;
      cursor: wait;
    }
  `;
  document.documentElement.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "voltara-fb-inline-panel";
  panel.innerHTML = `
    <div class="voltara-fb-panel-head">
      <span>Voltara Copy (FB)</span>
      <button class="voltara-fb-panel-toggle" type="button" title="Ẩn bảng điều khiển" aria-label="Ẩn bảng điều khiển">−</button>
    </div>
    <div class="voltara-fb-panel-body">
      <div class="voltara-fb-panel-actions">
        <button class="voltara-fb-panel-btn" type="button" data-action="fb-copy-current">Copy bài này</button>
        <button class="voltara-fb-panel-btn secondary" type="button" data-action="fb-scan">Gắn nút Copy</button>
        <button class="voltara-fb-panel-btn" type="button" data-action="fb-copy-all">Copy toàn trang</button>
        <button class="voltara-fb-panel-btn secondary" type="button" data-action="fb-stop">Dừng</button>
      </div>
      <div class="voltara-fb-panel-status">Sẵn sàng trên Facebook.</div>
    </div>
  `;
  document.body.appendChild(panel);

  const launcher = document.createElement("button");
  launcher.id = "voltara-fb-inline-launcher";
  launcher.type = "button";
  launcher.title = "Mở Voltara Copy (FB)";
  launcher.setAttribute("aria-label", "Mở Voltara Copy Facebook");
  launcher.textContent = "V";
  document.body.appendChild(launcher);

  const statusEl = panel.querySelector(".voltara-fb-panel-status");
  const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
  };

  const panelVisibilityKey = "voltara_fb_panel_hidden";
  const setPanelHidden = (hidden, persist = true) => {
    panel.classList.toggle("voltara-hidden", hidden);
    launcher.classList.toggle("voltara-visible", hidden);
    if (persist && chrome?.storage?.local) {
      chrome.storage.local.set({ [panelVisibilityKey]: hidden });
    }
  };

  panel.querySelector(".voltara-fb-panel-toggle")?.addEventListener("click", () => {
    setPanelHidden(true);
  });
  launcher.addEventListener("click", () => setPanelHidden(false));
  if (chrome?.storage?.local) {
    chrome.storage.local.get(panelVisibilityKey, (result) => {
      setPanelHidden(result?.[panelVisibilityKey] === true, false);
    });
  }

  panel.querySelector("[data-action='fb-copy-current']")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    setStatus("Đang quét bài viết hiện tại...");
    try {
      const data = await scrapeFacebookPost();
      await importVoltaraFacebookPost(data);
      setStatus(`Đã gửi: ${data.pageName || "Bài viết"}`);
    } catch (err) {
      setStatus(err?.message || "Không copy được bài viết này.");
    } finally {
      btn.disabled = false;
    }
  });

  panel.querySelector("[data-action='fb-scan']")?.addEventListener("click", () => {
    const count = injectVoltaraFacebookButtons(setStatus);
    setStatus(`Đã gắn ${count} nút Copy trên trang.`);
  });

  panel.querySelector("[data-action='fb-copy-all']")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    if (isFbQueueRunning) {
      setStatus("Hàng đợi copy Facebook đang chạy.");
      return;
    }

    const rawLimit = window.prompt("Số bài muốn copy từ Fanpage (1-100):", "20");
    if (rawLimit === null) return;
    const maxPosts = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(maxPosts) || maxPosts < 1 || maxPosts > 100) {
      setStatus("Vui lòng nhập số bài từ 1 đến 100.");
      return;
    }

    btn.disabled = true;
    try {
      await runFbBatchCopy(setStatus, maxPosts);
    } finally {
      btn.disabled = false;
    }
  });

  panel.querySelector("[data-action='fb-stop']")?.addEventListener("click", () => {
    isFbQueueRunning = false;
    clearFacebookPostQueue();
    setStatus("Đã dừng hàng đợi copy Facebook.");
  });

  injectVoltaraFacebookButtons(setStatus);
  const observer = new MutationObserver(() => injectVoltaraFacebookButtons(setStatus));
  observer.observe(document.body, { childList: true, subtree: true });
  resumeFacebookPostQueueIfNeeded(setStatus);
}

function injectVoltaraFacebookButtons(setStatus) {
  const posts = findFacebookPostsOnPage();
  let added = 0;

  posts.forEach(post => {
    if (post.dataset.voltaraFbAttached === "1") return;
    if (post.querySelector(".voltara-fb-post-copy-btn")) return;
    post.dataset.voltaraFbAttached = "1";

    const currentPosition = getComputedStyle(post).position;
    if (currentPosition === "static" || !currentPosition) {
      post.style.position = "relative";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "voltara-fb-post-copy-btn";
    btn.textContent = "+ Copy";
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      btn.disabled = true;
      btn.textContent = "Đang gửi...";
      
      try {
        const postData = await extractFacebookPostData(post);
        setStatus?.(`Đang gửi bài viết của: ${postData.pageName}...`);
        
        await importVoltaraFacebookPost(postData);
        setStatus?.(`Đã gửi thành công bài viết của: ${postData.pageName}`);
        
        btn.textContent = "Đã copy ✓";
        btn.style.background = "#10b981";
        btn.style.borderColor = "#059669";
        
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = "+ Copy";
          btn.style.background = "#1877f2";
          btn.style.borderColor = "#145dbf";
        }, 3000);
      } catch (err) {
        setStatus?.(err?.message || "Copy bài viết thất bại.");
        btn.disabled = false;
        btn.textContent = "Lỗi ✕";
        btn.style.background = "#ef4444";
        btn.style.borderColor = "#dc2626";
        
        setTimeout(() => {
          btn.textContent = "+ Copy";
          btn.style.background = "#1877f2";
          btn.style.borderColor = "#145dbf";
        }, 3000);
      }
    });

    post.appendChild(btn);
    added += 1;
  });

  return added;
}

function getFacebookBatchPostKey(postEl) {
  const selectors = [
    'a[href*="/posts/"]',
    'a[href*="story_fbid="]',
    'a[href*="/permalink/"]',
    'a[href*="/reel/"]',
    'a[href*="/videos/"]',
    'a[href*="fbid="]'
  ];
  const anchor = selectors.map(selector => postEl.querySelector(selector)).find(Boolean);
  if (anchor?.href) {
    try {
      const url = new URL(anchor.href, window.location.origin);
      const storyId = url.searchParams.get("story_fbid") || url.searchParams.get("fbid") || "";
      return `${url.pathname.replace(/\/$/, "")}${storyId ? `?id=${storyId}` : ""}`;
    } catch (_) {
      return anchor.href.split("#")[0];
    }
  }

  const pagelet = postEl.getAttribute("data-pagelet") || "";
  const text = (postEl.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240);
  const mediaEl = postEl.querySelector("video, img");
  const media = mediaEl?.currentSrc || mediaEl?.src || "";
  return `${pagelet}|${text}|${media}`;
}

function expandFacebookPostText(postEl) {
  const controls = Array.from(postEl.querySelectorAll('[role="button"], button, div[tabindex="0"], span'));
  let clicked = 0;
  controls.forEach(control => {
    if (clicked >= 3) return;
    const label = (control.innerText || control.textContent || "").replace(/\s+/g, " ").trim();
    if (!/^(Xem thêm|See more)$/i.test(label)) return;
    if (control.closest('[role="comment"], [data-testid*="comment" i]')) return;
    try {
      control.click();
      clicked += 1;
    } catch (_) {
      // Facebook may replace a control while rendering the feed.
    }
  });
  return clicked;
}

function getFacebookPostUrlForQueue(postEl) {
  const selectors = [
    'a[href*="/posts/"]',
    'a[href*="story_fbid="]',
    'a[href*="/permalink/"]',
    'a[href*="/reel/"]',
    'a[href*="/videos/"]'
  ];
  const anchor = selectors.map(selector => postEl.querySelector(selector)).find(Boolean);
  if (!anchor?.href) return "";
  try {
    return window.VoltaraFacebookParser?.utils?.cleanFacebookUrl(anchor.href) || anchor.href;
  } catch (_) {
    return anchor.href;
  }
}

function getFacebookPostQueue() {
  return new Promise(resolve => {
    chrome.storage.local.get("voltaraFacebookPostQueue", result => {
      resolve(result.voltaraFacebookPostQueue || null);
    });
  });
}

function setFacebookPostQueue(queue) {
  return new Promise(resolve => {
    chrome.storage.local.set({ voltaraFacebookPostQueue: queue }, resolve);
  });
}

function clearFacebookPostQueue() {
  return new Promise(resolve => {
    chrome.storage.local.remove("voltaraFacebookPostQueue", resolve);
  });
}

function getFacebookPostIdentity(url) {
  if (!url) return "";
  const patterns = [
    /\/posts\/(pfbid[A-Za-z0-9]+)/i,
    /\/posts\/(\d+)/i,
    /story_fbid=(\d+)/i,
    /\/reel\/([A-Za-z0-9_-]+)/i,
    /\/videos\/(\d+)/i,
    /\/permalink\/(\d+)/i
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

async function prepareFacebookVideoForQueue() {
  const videos = Array.from(document.querySelectorAll('video')).filter(video => {
    const rect = video.getBoundingClientRect();
    return rect.width >= 160 && rect.height >= 160 && rect.bottom > 0 && rect.top < window.innerHeight;
  });
  if (!videos.length) return;
  const video = videos.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return (br.width * br.height) - (ar.width * ar.height);
  })[0];
  try {
    // Preserve Facebook's own mute/volume state. We only make sure the active
    // player is running long enough for both DASH requests to be observed.
    if (video.paused) await video.play();
    await new Promise(resolve => setTimeout(resolve, 1200));
  } catch (_) {
    // Autoplay may be blocked; the normal parser still keeps the post URL.
  }
}

async function resumeFacebookPostQueueIfNeeded(setStatus) {
  const queue = await getFacebookPostQueue();
  if (!queue?.active || !Array.isArray(queue.items) || queue.items.length === 0) return;

  isFbQueueRunning = true;
  const current = queue.items[queue.index];
  if (!current) {
    await finishFacebookPostQueue(queue, setStatus);
    return;
  }

  const expectedId = getFacebookPostIdentity(current.url);
  const currentId = getFacebookPostIdentity(window.location.href);
  if (!expectedId || currentId !== expectedId) {
    queue.openedAt = Date.now();
    await setFacebookPostQueue(queue);
    setStatus?.(`Đang mở bài ${queue.index + 1}/${queue.items.length}...`);
    window.location.href = current.url;
    return;
  }

  window.__voltaraFacebookVideoNotBefore = Number(queue.openedAt) || Date.now() - 10000;
  setStatus?.(`Đang copy bài ${queue.index + 1}/${queue.items.length}...`);
  await new Promise(resolve => setTimeout(resolve, 1700));

  try {
    await prepareFacebookVideoForQueue();
    const postData = await scrapeFacebookPost();
    await importVoltaraFacebookPost(postData);
    queue.successCount = (queue.successCount || 0) + 1;
    setStatus?.(`Đã copy ${queue.index + 1}/${queue.items.length}: ${postData.pageName || "Bài viết"}`);
  } catch (err) {
    queue.failCount = (queue.failCount || 0) + 1;
    console.error("Facebook detail queue copy error:", err);
    setStatus?.(`Bài ${queue.index + 1} lỗi: ${err?.message || "không copy được"}`);
  }

  queue.index += 1;
  if (queue.index >= queue.items.length) {
    await finishFacebookPostQueue(queue, setStatus);
    return;
  }

  queue.openedAt = Date.now();
  await setFacebookPostQueue(queue);
  await new Promise(resolve => setTimeout(resolve, 900));
  window.location.href = queue.items[queue.index].url;
}

async function finishFacebookPostQueue(queue, setStatus) {
  await clearFacebookPostQueue();
  isFbQueueRunning = false;
  const successCount = queue.successCount || 0;
  const failCount = queue.failCount || 0;
  setStatus?.(`Hoàn tất. Thành công: ${successCount}, lỗi: ${failCount}.`);
  if (queue.returnUrl) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    window.location.href = queue.returnUrl;
  }
}

async function runFbBatchCopy(setStatus, maxPosts = 20) {
  isFbQueueRunning = true;
  const found = new Map();
  let emptyRounds = 0;

  window.scrollTo({ top: 0, behavior: "smooth" });
  await new Promise(resolve => setTimeout(resolve, 1200));
  setStatus(`Đang tìm permalink của ${maxPosts} bài...`);

  while (isFbQueueRunning && found.size < maxPosts && emptyRounds < 6) {
    const posts = findFacebookPostsOnPage().sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
    );
    const sizeBefore = found.size;
    posts.forEach(post => {
      if (found.size >= maxPosts) return;
      const url = getFacebookPostUrlForQueue(post);
      const key = getFacebookBatchPostKey(post) || getFacebookPostIdentity(url);
      if (url && key && !found.has(key)) found.set(key, { url });
    });

    if (found.size === sizeBefore) emptyRounds += 1;
    else emptyRounds = 0;
    setStatus(`Đã tìm ${found.size}/${maxPosts} bài; đang cuộn tải thêm...`);

    if (found.size >= maxPosts) break;
    const lastPost = posts[posts.length - 1];
    if (lastPost) lastPost.scrollIntoView({ behavior: "smooth", block: "end" });
    window.scrollBy({ top: Math.max(700, window.innerHeight * 0.8), behavior: "smooth" });
    await new Promise(resolve => setTimeout(resolve, 1800));
  }

  if (!isFbQueueRunning) {
    setStatus("Đã dừng quét bài viết Facebook.");
    return;
  }
  if (found.size === 0) {
    isFbQueueRunning = false;
    setStatus("Không tìm thấy permalink bài viết trong feed.");
    return;
  }

  const queue = {
    active: true,
    returnUrl: window.location.href,
    items: Array.from(found.values()),
    index: 0,
    successCount: 0,
    failCount: 0,
    openedAt: Date.now()
  };
  await setFacebookPostQueue(queue);
  setStatus(`Đã tìm ${queue.items.length} bài. Bắt đầu mở từng bài để copy chính xác...`);
  await new Promise(resolve => setTimeout(resolve, 700));
  window.location.href = queue.items[0].url;
}
