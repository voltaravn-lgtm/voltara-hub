// Facebook Post Author/Header Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.authorParser = {
  extractFacebookAuthor: function(article) {
    const defaultAuthor = { name: "", pageUrl: null, avatarUrl: null };
    if (!article) return defaultAuthor;

    const dbg = window.VoltaraFacebookParser.debug;
    const utils = window.VoltaraFacebookParser.utils;
    let name = "";
    let pageUrl = null;
    let avatarUrl = null;

    // 1. Locate the avatar image inside the article header
    const imgs = Array.from(article.querySelectorAll('img'));
    let avatarImg = null;
    
    for (const img of imgs) {
      if (img.src.includes("emoji.php") || img.src.includes("rsrc.php")) continue;
      // Skip comments, sidebar, and shared-sub-posts
      if (utils.isInsideComment(img, article) || img.closest('[role="complementary"]')) {
        continue;
      }
      
      const width = img.naturalWidth || img.clientWidth || img.width || 0;
      const height = img.naturalHeight || img.clientHeight || img.height || 0;
      
      // Facebook header profile pictures are under 60px wide
      if (width > 0 && width <= 60) {
        avatarImg = img;
        break;
      }
      if (img.closest('[class*="avatar"], [class*="Avatar"], [class*="profile"], [class*="Profile"]')) {
        avatarImg = img;
        break;
      }
    }

    if (avatarImg) {
      avatarUrl = avatarImg.src || null;
    }

    // 2. Locate the author name link (anchor tag in header)
    const headerSelectors = [
      'h2 a[role="link"]',
      'h3 a[role="link"]',
      'h1 a[role="link"]',
      'strong a[role="link"]',
      'span.xt0psk2 a',
      'a[role="link"][tabindex="0"]'
    ];

    let authorAnchor = null;

    for (const selector of headerSelectors) {
      const anchors = Array.from(article.querySelectorAll(selector));
      for (const a of anchors) {
        if (utils.isInsideComment(a, article) || a.closest('[role="complementary"]')) continue;
        
        const href = a.getAttribute("href") || "";
        // Skip timestamp post/permalink or group links
        if (href.includes("/posts/") || href.includes("/permalink/") || href.includes("/videos/") || href.includes("/groups/")) {
          continue;
        }

        const text = (a.innerText || a.textContent || "").trim();
        // Skip common timeline headers like numbers or action phrases
        if (text && text.length > 2 && !/^\d+/.test(text) && text !== "Xem thêm" && text !== "See more") {
          authorAnchor = a;
          break;
        }
      }
      if (authorAnchor) break;
    }

    // 3. Fallback to anchor parent of avatar
    if (!authorAnchor && avatarImg) {
      const parentAnchor = avatarImg.closest('a[role="link"]');
      if (parentAnchor) {
        const headerContainer = parentAnchor.closest('div, h2, h3, h4');
        if (headerContainer) {
          const siblingAnchors = Array.from(headerContainer.querySelectorAll('a[role="link"]'));
          for (const a of siblingAnchors) {
            if (a === parentAnchor) continue;
            const text = (a.innerText || a.textContent || "").trim();
            if (text && text.length > 2 && !/^\d+/.test(text)) {
              authorAnchor = a;
              break;
            }
          }
        }
      }
    }

    if (authorAnchor) {
      name = (authorAnchor.innerText || authorAnchor.textContent || "").trim();
      let href = authorAnchor.getAttribute("href") || "";
      if (href) {
        if (href.startsWith("/")) {
          href = "https://www.facebook.com" + href;
        }
        try {
          const u = new URL(href);
          u.search = ""; // Clean tracking queries for author URL
          pageUrl = u.toString();
          if (pageUrl.endsWith("/")) pageUrl = pageUrl.slice(0, -1);
        } catch (e) {
          pageUrl = href;
        }
      }
    }

    if (!name || name.length < 2) {
      dbg.warn("Author name could not be reliably extracted.");
      return defaultAuthor;
    }

    return {
      name: name,
      pageUrl: pageUrl,
      avatarUrl: avatarUrl
    };
  }
};
