// Background service worker for Voltara Product Importer (Manifest V3)

const facebookVideoRequestsByTab = new Map();
const facebookRouteStartedAtByTab = new Map();

// Facebook is a single-page app: opening another post/reel can keep the same
// browser tab and the old media requests. Reset the candidates as soon as the
// route changes so the first copy can never reuse a previous channel's video.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const nextUrl = changeInfo.url || tab?.url || "";
  if (!nextUrl.includes("facebook.com")) return;
  if (changeInfo.url || changeInfo.status === "loading") {
    facebookVideoRequestsByTab.delete(tabId);
    facebookRouteStartedAtByTab.set(tabId, Date.now());
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  facebookVideoRequestsByTab.delete(tabId);
  facebookRouteStartedAtByTab.delete(tabId);
});

chrome.webRequest.onHeadersReceived.addListener(
  details => {
    if (details.tabId < 0) return;
    const contentTypeHeader = (details.responseHeaders || []).find(header =>
      header.name?.toLowerCase() === "content-type"
    );
    const contentType = (contentTypeHeader?.value || "").toLowerCase();
    const mediaKind = contentType.startsWith("video/")
      ? "video"
      : (contentType.startsWith("audio/") ? "audio" : "");
    if (!mediaKind) return;
    // Facebook often appends byte-range query parameters to an otherwise
    // complete signed MP4 URL. Remove only those range parameters; the URL is
    // verified again before it is returned to the content script.
    let candidateUrl = details.url;
    try {
      const parsed = new URL(candidateUrl);
      parsed.searchParams.delete("bytestart");
      parsed.searchParams.delete("byteend");
      candidateUrl = parsed.toString();
    } catch {}

    const current = facebookVideoRequestsByTab.get(details.tabId) || [];
    const next = [
      { url: candidateUrl, quality: `network-${mediaKind}-response`, mediaKind, contentType, capturedAt: Date.now() },
      ...current.filter(item => item.url !== candidateUrl)
    ].slice(0, 10);
    facebookVideoRequestsByTab.set(details.tabId, next);
  },
  {
    urls: ["https://*.fbcdn.net/*", "https://*.fbsbx.com/*"],
    types: ["media", "xmlhttprequest", "other"]
  },
  ["responseHeaders"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_FACEBOOK_VIDEO_URLS") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, urls: [], error: "Không xác định được tab Facebook." });
      return true;
    }

    const routeStartedAt = facebookRouteStartedAtByTab.get(tabId) || 0;
    const notBefore = Math.max(Number(request.notBefore) || 0, routeStartedAt);
    extractFacebookVideoUrlsInMainWorld(tabId, notBefore)
      .then(urls => sendResponse({ success: true, urls }))
      .catch(err => {
        console.warn("Facebook direct video URL extraction failed:", err);
        sendResponse({ success: false, urls: [], error: err.message });
      });
    return true;
  }

  if (request.type === "IMPORT_FACEBOOK_POST") {
    handleImportFacebookPost(request.postData)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        console.error("Facebook post import error in background worker:", err);
        sendResponse({ success: false, error: err.message || "Lỗi kết nối không xác định." });
      });
    return true; // Keep the message channel open
  }

  if (request.type === "IMPORT_PRODUCT") {
    // We must handle this asynchronously, so return true
    handleImportProduct(request.productData)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        console.error("Import error in background worker:", err);
        sendResponse({ success: false, error: err.message || "Lỗi kết nối không xác định." });
      });
    return true; // Keep the message channel open for sendResponse
  }
  
  if (request.type === "TEST_CONNECTION") {
    handleTestConnection(request.hubUrl, request.token)
      .then(result => {
        sendResponse(result);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message || "Không thể kết nối đến Hub." });
      });
    return true;
  }

  if (request.type === "GET_SHOPEE_PAGE_STATE") {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({
        success: false,
        state: null
      });
      return true;
    }

    chrome.scripting.executeScript({
      target: {
        tabId
      },
      world: "MAIN",
      func: () => {
        try {
          const findNestedItem = (obj, depth = 0) => {
            if (!obj || typeof obj !== "object" || depth > 10) return null;
            
            const hasItemId = obj.itemid || obj.itemId || obj.item_id || obj.item_id_str;
            const hasPrice = obj.price_min || obj.priceMin || obj.price || obj.price_max || obj.price_before_discount;
            const hasName = obj.name || obj.title || obj.itemName;
            const hasDescription = obj.description || obj.description_info || obj.rich_text_description || obj.extended_description;
            
            if (hasItemId && hasName && (hasPrice || hasDescription)) {
              const safeCopy = (val) => {
                try {
                  return JSON.parse(JSON.stringify(val));
                } catch (e) {
                  return null;
                }
              };

              return {
                itemid: obj.itemid || obj.itemId || obj.item_id || null,
                price: typeof obj.price === "number" || typeof obj.price === "string" ? obj.price : null,
                price_min: obj.price_min || obj.priceMin || null,
                price_max: obj.price_max || obj.priceMax || null,
                price_before_discount: obj.price_before_discount || obj.priceBeforeDiscount || obj.price_max_before_discount || obj.price_min_before_discount || null,
                name: typeof obj.name === "string" ? obj.name : (typeof obj.title === "string" ? obj.title : (typeof obj.itemName === "string" ? obj.itemName : null)),
                images: Array.isArray(obj.images) ? obj.images.map(img => typeof img === "string" ? img : null).filter(Boolean) : null,
                image: typeof obj.image === "string" ? obj.image : null,
                attributes: Array.isArray(obj.attributes) ? safeCopy(obj.attributes) : (Array.isArray(obj.item_attributes) ? safeCopy(obj.item_attributes) : (Array.isArray(obj.itemAttributes) ? safeCopy(obj.itemAttributes) : null)),
                tier_variations: Array.isArray(obj.tier_variations) ? safeCopy(obj.tier_variations) : (Array.isArray(obj.tierVariations) ? safeCopy(obj.tierVariations) : null),
                description: typeof obj.description === "string" ? obj.description : null,
                description_info: obj.description_info && typeof obj.description_info === "object" ? safeCopy(obj.description_info) : null,
                rich_text_description: obj.rich_text_description && typeof obj.rich_text_description === "object" ? safeCopy(obj.rich_text_description) : null,
                extended_description: obj.extended_description && typeof obj.extended_description === "object" ? safeCopy(obj.extended_description) : null,
                detailed_description: obj.detailed_description && typeof obj.detailed_description === "object" ? safeCopy(obj.detailed_description) : null,
                item_description: obj.item_description && typeof obj.item_description === "object" ? safeCopy(obj.item_description) : null,
                preview_info: obj.preview_info && typeof obj.preview_info === "object" ? safeCopy(obj.preview_info) : null,
                image_info: obj.image_info && typeof obj.image_info === "object" ? safeCopy(obj.image_info) : null,
                brand: typeof obj.brand === "string" ? obj.brand : null,
                shopid: obj.shopid || obj.shopId || obj.shop_id || null,
                item_sku: typeof obj.item_sku === "string" ? obj.item_sku : (typeof obj.itemSku === "string" ? obj.itemSku : (typeof obj.sku === "string" ? obj.sku : null))
              };
            }
            
            for (const key of Object.keys(obj)) {
              try {
                const val = obj[key];
                if (val && typeof val === "object") {
                  const res = findNestedItem(val, depth + 1);
                  if (res) return res;
                }
              } catch (e) {}
            }
            return null;
          };

          const state = window.__PRELOADED_STATE__ || window.__INITIAL_STATE__ || null;
          if (state) {
            const nested = findNestedItem(state);
            if (nested) return nested;
          }
          return null;
        } catch {
          return null;
        }
      }
    }).then(results => {
      sendResponse({
        success: true,
        state: results?.[0]?.result || null
      });
    }).catch(error => {
      console.warn(
        "Không đọc được Shopee state",
        error
      );
      sendResponse({
        success: false,
        state: null
      });
    });

    return true;
  }
});

async function extractFacebookVideoUrlsInMainWorld(tabId, notBefore = 0) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const found = new Map();

      const normalizeUrl = raw => {
        if (typeof raw !== "string" || !raw) return "";
        let value = raw.trim()
          .replace(/&amp;/g, "&")
          .replace(/\\u0025/gi, "%")
          .replace(/\\u0026/gi, "&")
          .replace(/\\u003a/gi, ":")
          .replace(/\\u003d/gi, "=")
          .replace(/\\\//g, "/");
        if (value.startsWith("//")) value = "https:" + value;
        if (!/^https?:\/\//i.test(value) || value.startsWith("blob:")) return "";
        try {
          const parsed = new URL(value);
          const host = parsed.hostname.toLowerCase();
          if (!host.includes("fbcdn.net") && !host.includes("fbsbx.com")) return "";
          if (/\.(?:jpg|jpeg|png|gif|webp)(?:$|\?)/i.test(parsed.pathname + parsed.search)) return "";
          return parsed.toString();
        } catch {
          return "";
        }
      };

      const add = (raw, hint = "unknown") => {
        const url = normalizeUrl(raw);
        if (!url) return;
        const lowerHint = String(hint).toLowerCase();
        let score = 10;
        if (/quality_hd|native_hd|\bhd\b/.test(lowerHint)) score += 100;
        if (/playable|native_sd|video_url/.test(lowerHint)) score += 70;
        if (/currentsrc|source|dom/.test(lowerHint)) score += 40;
        if (/\.mp4(?:$|\?)/i.test(url)) score += 20;
        const previous = found.get(url);
        if (!previous || previous.score < score) found.set(url, { url, quality: hint, score });
      };

      const allVideos = Array.from(document.querySelectorAll("video"));
      const visibleVideos = allVideos.filter(video => {
        const rect = video.getBoundingClientRect();
        return rect.width >= 120 && rect.height >= 120 && rect.bottom > 0 && rect.top < window.innerHeight;
      }).sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      });
      // Only inspect the player the user can currently see. Facebook keeps
      // preloaded videos from previous/next Reels mounted in the DOM.
      const videos = visibleVideos.length ? visibleVideos.slice(0, 1) : allVideos.slice(0, 1);
      videos.forEach(video => {
        add(video.currentSrc, "dom-currentSrc");
        add(video.src, "dom-src");
        add(video.getAttribute("data-video-url"), "dom-data-video-url");
        video.querySelectorAll("source").forEach(source => add(source.src || source.getAttribute("data-src"), "dom-source"));
      });

      // React keeps the playable_url/browser_native_* fields in props/fibers
      // even when the DOM video source itself is only a MediaSource blob URL.
      const seen = new WeakSet();
      const stack = [];
      videos.forEach(video => {
        let node = video;
        for (let level = 0; node && level < 7; level++, node = node.parentElement) {
          Object.keys(node).forEach(key => {
            if (/^__react(?:Props|Fiber|Container)/.test(key)) {
              try { stack.push({ value: node[key], key, depth: 0 }); } catch {}
            }
          });
        }
      });

      let visited = 0;
      while (stack.length && visited < 30000) {
        const item = stack.pop();
        const value = item.value;
        visited++;
        if (typeof value === "string") {
          if (/playable_url|browser_native|video_url|progressive_url|hd_src|sd_src/i.test(item.key)) add(value, item.key);
          continue;
        }
        if (!value || typeof value !== "object" || item.depth > 11) continue;
        if (seen.has(value)) continue;
        seen.add(value);
        if (value instanceof Node && item.depth > 0) continue;
        let keys = [];
        try { keys = Object.keys(value).slice(0, 250); } catch { continue; }
        keys.forEach(key => {
          let child;
          try { child = value[key]; } catch { return; }
          if (typeof child === "string") {
            if (/playable_url|browser_native|video_url|videoUrl|progressive_url|hd_src|sd_src/i.test(key)) add(child, key);
          } else if (child && typeof child === "object") {
            stack.push({ value: child, key, depth: item.depth + 1 });
          }
        });
      }

      return Array.from(found.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ url, quality }) => ({ url, quality }));
    }
  });
  const pageCandidates = results?.[0]?.result || [];
  const capturedCandidates = (facebookVideoRequestsByTab.get(tabId) || [])
    .filter(item => Date.now() - item.capturedAt < 30 * 60 * 1000)
    .filter(item => !notBefore || item.capturedAt >= notBefore)
    .map(({ url, quality, mediaKind, contentType }) => ({ url, quality, mediaKind, contentType }));
  const candidates = [...pageCandidates, ...capturedCandidates].filter((item, index, all) =>
    all.findIndex(other => other.url === item.url) === index
  );

  // CDN host alone is not enough: Facebook thumbnails and videos can both use
  // extension-less fbcdn URLs. Verify the response headers with a one-byte
  // range request and inspect the MP4 init data for a real `vide` track.
  const checked = await Promise.all(candidates.map(async candidate => {
    try {
      const response = await fetch(candidate.url, {
        method: "GET",
        headers: { Range: "bytes=0-524287" },
        credentials: "include",
        cache: "no-store"
      });
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!response.ok || (!contentType.startsWith("video/") && !contentType.startsWith("audio/")) || !response.body) {
        try { await response.body?.cancel(); } catch {}
        return null;
      }

      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      while (total < 524288) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const remaining = 524288 - total;
        const piece = value.length > remaining ? value.slice(0, remaining) : value;
        chunks.push(piece);
        total += piece.length;
      }
      try { await reader.cancel(); } catch {}

      const bytes = new Uint8Array(total);
      let offset = 0;
      chunks.forEach(chunk => {
        bytes.set(chunk, offset);
        offset += chunk.length;
      });
      const mp4Header = new TextDecoder("latin1").decode(bytes);
      const hasVideoTrack = mp4Header.includes("vide");
      const hasAudioTrack = mp4Header.includes("soun");
      if (!hasVideoTrack && !hasAudioTrack) return null;
      return {
        ...candidate,
        contentType,
        mediaKind: hasVideoTrack ? "video" : "audio",
        hasVideoTrack,
        hasAudioTrack,
        hasAudio: hasAudioTrack,
        quality: hasVideoTrack && hasAudioTrack ? `${candidate.quality || "facebook"}-with-audio` : candidate.quality
      };
    } catch {
      return null;
    }
  }));
  return checked
    .filter(Boolean)
    .sort((a, b) => {
      const aMuxed = Number(a.hasVideoTrack && a.hasAudioTrack);
      const bMuxed = Number(b.hasVideoTrack && b.hasAudioTrack);
      if (aMuxed !== bMuxed) return bMuxed - aMuxed;
      return Number(b.hasVideoTrack) - Number(a.hasVideoTrack);
    })
    .slice(0, 16);
}

async function handleImportFacebookPost(postData) {
  const settings = await chrome.storage.local.get(["hubUrl", "token"]);
  
  const hubUrl = settings.hubUrl ? settings.hubUrl.trim().replace(/\/$/, "") : "";
  const token = settings.token ? settings.token.trim() : "";

  if (!hubUrl) {
    return { success: false, error: "Chưa cấu hình Địa chỉ Voltara Product Hub. Vui lòng vào trang Tùy chọn để cài đặt." };
  }
  if (!token) {
    return { success: false, error: "Chưa nhập Mã kết nối. Vui lòng vào trang Tùy chọn để cấu hình." };
  }

  const apiUrl = `${hubUrl}/api/extensions/facebook/import`;
  console.log("[Voltara SDK Debug] Importing Facebook post to URL:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });

    console.log("[Voltara SDK Debug] Facebook import HTTP status:", response.status);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return { success: false, error: "Máy chủ không trả về API JSON hợp lệ khi import bài viết." };
    }

    const data = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.message || `Lỗi máy chủ: ${response.status} ${response.statusText}` 
      };
    }

    return { 
      success: true, 
      importId: data.importId, 
      message: data.message || "Đã gửi bài viết về Voltara Product Hub thành công!" 
    };
  } catch (err) {
    console.error("[Voltara SDK Debug] Import facebook post failed:", err);
    return { 
      success: false, 
      error: "Không thể kết nối đến Voltara Product Hub. Vui lòng kiểm tra lại Địa chỉ Hub hoặc kết nối mạng của bạn." 
    };
  }
}

async function handleImportProduct(productData) {
  // Retrieve settings from chrome.storage.local
  const settings = await chrome.storage.local.get(["hubUrl", "token"]);
  
  const hubUrl = settings.hubUrl ? settings.hubUrl.trim().replace(/\/$/, "") : "";
  const token = settings.token ? settings.token.trim() : "";

  if (!hubUrl) {
    return { success: false, error: "Chưa cấu hình Địa chỉ Voltara Product Hub. Vui lòng vào trang Tùy chọn để cài đặt." };
  }
  if (!token) {
    return { success: false, error: "Chưa nhập Mã kết nối. Vui lòng vào trang Tùy chọn để cấu hình." };
  }

  const apiUrl = `${hubUrl}/api/extensions/products/import`;
  console.log("[Voltara SDK Debug] Importing product to URL:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(productData)
    });

    console.log("[Voltara SDK Debug] Import HTTP status:", response.status);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return { success: false, error: "Máy chủ không trả về API JSON hợp lệ khi import sản phẩm." };
    }

    const data = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.message || `Lỗi máy chủ: ${response.status} ${response.statusText}` 
      };
    }

    return { 
      success: true, 
      importId: data.importId, 
      message: data.message || "Đã gửi sản phẩm về Voltara Product Hub thành công!" 
    };
  } catch (err) {
    console.error("[Voltara SDK Debug] Import product failed:", err);
    return { 
      success: false, 
      error: "Không thể kết nối đến Voltara Product Hub. Vui lòng kiểm tra lại Địa chỉ Hub hoặc kết nối mạng của bạn." 
    };
  }
}

async function handleTestConnection(hubUrl, token) {
  // - Xóa khoảng trắng đầu cuối và dấu / cuối URL
  const cleanedUrl = hubUrl ? hubUrl.trim().replace(/\/$/, "") : "";
  const cleanedToken = token ? token.trim() : "";

  if (!cleanedUrl) {
    return { success: false, error: "Địa chỉ Voltara Product Hub không được trống." };
  }
  if (!cleanedToken) {
    return { success: false, error: "Mã kết nối không được trống." };
  }

  const apiUrl = `${cleanedUrl}/api/extensions/connection/test`;

  console.log("[Voltara SDK Debug] Calling URL:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanedToken}`,
        "Accept": "application/json"
      }
    });

    console.log("[Voltara SDK Debug] HTTP status:", response.status);

    const contentType = response.headers.get("content-type") || "";
    console.log("[Voltara SDK Debug] Response Content-Type:", contentType);

    if (!contentType.includes("application/json")) {
      const errorText = await response.text();
      console.log("[Voltara SDK Debug] Response non-JSON text (partial):", errorText.substring(0, 200));
      return { success: false, error: "Máy chủ không trả về API JSON hợp lệ." };
    }

    const data = await response.json();
    console.log("[Voltara SDK Debug] Response body:", data);

    if (response.status === 401) {
      return { success: false, error: "Thiếu mã kết nối." };
    }

    if (response.status === 403) {
      return { success: false, error: "Mã kết nối không hợp lệ." };
    }

    if (!response.ok) {
      return { success: false, error: data.message || `Lỗi máy chủ: ${response.status}` };
    }

    if (data.success && data.connected) {
      return { success: true, message: data.message || "Kết nối thành công!" };
    } else {
      return { success: false, error: data.message || "Lỗi xác thực hoặc hết hạn kết nối." };
    }
  } catch (err) {
    console.error("[Voltara SDK Debug] Fetch connection test failed:", err);
    return { success: false, error: "Không thể truy cập Voltara Product Hub." };
  }
}
