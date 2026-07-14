// Facebook Post Caption Text Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.textParser = {
  extractFacebookCaption: function(article) {
    if (!article) return "";

    const dbg = window.VoltaraFacebookParser.debug;
    const utils = window.VoltaraFacebookParser.utils;

    const cleanText = value => {
      const lines = String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/Xem thêm\.\.\.|See more\.\.\.|See More\.\.\./g, "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => {
          if (!line) return false;
          const lower = line.toLowerCase();
          if ([
            "xem thêm", "see more", "see more...", "xem thêm...",
            "ẩn bớt", "see less", "ẩn bản dịch", "hide translation",
            "+ copy", "đang gửi...", "đã copy ✓", "lỗi ✕",
            "thích", "like", "bình luận", "comment", "chia sẻ", "share"
          ].includes(lower)) return false;
          if (lower.startsWith("xem bản gốc") || lower.startsWith("see original")) return false;
          if (lower.includes("xếp hạng bản dịch này") || lower.includes("rate this translation")) return false;
          return true;
        });
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    };

    const isEligible = el => {
      if (!el || utils.isInsideComment(el, article)) return false;
      if (el.closest('h1, h2, h3, h4, h5, [role="button"], button, [class*="feedback" i], [class*="Footer" i]')) {
        return false;
      }
      const ownerArticle = el.closest('[role="article"]');
      if (article.getAttribute('role') === 'article') {
        return !ownerArticle || ownerArticle === article;
      }
      return article.contains(el);
    };

    const read = el => cleanText(el?.innerText || el?.textContent || "");

    // Facebook can split a long caption into several message nodes. Reading
    // only querySelector(...first) was the reason only the first line arrived.
    const primaryElements = Array.from(article.querySelectorAll(
      '[data-ad-comet-preview="message"], [data-ad-preview="message"]'
    )).filter(isEligible);

    const uniqueTexts = [];
    primaryElements.forEach(el => {
      const text = read(el);
      if (!text) return;
      if (uniqueTexts.some(existing => existing === text || existing.includes(text))) return;
      for (let i = uniqueTexts.length - 1; i >= 0; i--) {
        if (text.includes(uniqueTexts[i])) uniqueTexts.splice(i, 1);
      }
      uniqueTexts.push(text);
    });
    const primaryText = uniqueTexts.join("\n").trim();

    // Fallback for Reel/detail layouts where the message attributes are
    // missing. Choose the longest eligible rendered text block, not the first
    // one, because the first block is commonly just the caption headline.
    const fallbackElements = Array.from(article.querySelectorAll(
      '.xdj266r.x11i5rnm.xat24cr.x1mh8g0r, div[dir="auto"], span[dir="auto"]'
    )).filter(isEligible);
    const fallbackText = fallbackElements
      .map(read)
      .filter(text => text.length > 1)
      .sort((a, b) => b.length - a.length)[0] || "";

    const caption = fallbackText.length > primaryText.length ? fallbackText : primaryText;
    if (!caption) dbg.log("No caption text found in this post root.");
    return caption;
  }
};
