// Facebook Post Media/Image Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.mediaParser = {
  extractFacebookPostImages: function(article) {
    if (!article) return [];

    const dbg = window.VoltaraFacebookParser.debug;
    const utils = window.VoltaraFacebookParser.utils;
    const images = [];
    const seenPaths = new Set();

    const allImgs = Array.from(article.querySelectorAll('img'));
    dbg.log(`Found ${allImgs.length} raw images inside the article element.`);

    allImgs.forEach(img => {
      const src = img.src || "";
      if (!src) return;

      // 1. Must be Facebook CDN image
      const isFbCdn = src.includes("fbcdn.net") || src.includes("scontent");
      if (!isFbCdn) return;

      // 2. Exclude system graphics / assets / tracker files
      if (src.includes("emoji.php") || src.includes("rsrc.php") || src.includes("/rsrc/") || src.includes("/assets/")) {
        return;
      }

      // 3. Exclude author/header avatars
      const isAuthorAvatar = img.closest('h1, h2, h3, h4, h5, [class*="avatar"], [class*="Avatar"], [class*="profile"], [class*="Profile"], [id*="profile"], [id*="avatar"]');
      if (isAuthorAvatar) {
        dbg.log("Filtered image: author avatar", src);
        return;
      }

      // 4. Exclude comment avatars and comment images
      const isCommentImage = utils.isInsideComment(img, article);
      if (isCommentImage) {
        dbg.log("Filtered image: comment content", src);
        return;
      }

      // 5. Exclude feedback elements / reaction bars
      const isFeedback = img.closest('[class*="feedback"], [class*="Feedback"], [class*="UFI"]');
      if (isFeedback) {
        dbg.log("Filtered image: interactive feedback area", src);
        return;
      }

      // 6. Exclude sidebar and page introduction elements
      const isSidebarIntro = img.closest('div[data-pagelet*="About"], div[data-pagelet*="Intro"], div[class*="About"], div[class*="intro"], div[class*="Intro"]');
      if (isSidebarIntro) {
        dbg.log("Filtered image: sidebar / about page info", src);
        return;
      }

      // 7. Check dimensions
      const width = img.clientWidth || img.width || img.naturalWidth || 0;
      const height = img.clientHeight || img.height || img.naturalHeight || 0;
      
      // Filter out small avatars / square elements in headers
      if (width > 0 && height > 0) {
        if (width < 100 || height < 100) {
          dbg.log(`Filtered image: too small (${width}x${height})`, src);
          return;
        }
      }

      // 8. Deduplicate by pathname to avoid identical images in gallery
      try {
        const urlObj = new URL(src);
        const path = urlObj.pathname;
        if (seenPaths.has(path)) {
          return;
        }
        seenPaths.add(path);
      } catch (e) {
        if (seenPaths.has(src)) return;
        seenPaths.add(src);
      }

      images.push({
        type: "image",
        url: src,
        thumbnailUrl: null,
        width: width > 0 ? width : null,
        height: height > 0 ? height : null
      });
    });

    dbg.log(`Extracted ${images.length} high-quality images after filtering.`, images);
    return images;
  }
};
