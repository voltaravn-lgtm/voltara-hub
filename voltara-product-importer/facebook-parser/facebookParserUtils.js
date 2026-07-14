// Utility functions for Facebook Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.utils = {
  cleanFacebookUrl: function(url) {
    if (!url) return "";
    try {
      // If the URL contains relative path, make it absolute
      let targetUrl = url;
      if (targetUrl.startsWith("/")) {
        targetUrl = "https://www.facebook.com" + targetUrl;
      }
      
      const u = new URL(targetUrl);
      const paramsToKeep = ["story_fbid", "fbid", "id", "set", "v"];
      const searchParams = new URLSearchParams(u.search);
      const newParams = new URLSearchParams();
      
      for (const [key, val] of searchParams.entries()) {
        if (paramsToKeep.includes(key)) {
          newParams.set(key, val);
        }
      }
      u.search = newParams.toString();
      // Remove trailing slashes and normalize
      let result = u.toString();
      if (result.endsWith("/")) {
        result = result.slice(0, -1);
      }
      return result;
    } catch (e) {
      return url;
    }
  },

  getInnerText: function(el) {
    if (!el) return "";
    return (el.innerText || el.textContent || "").trim();
  },

  isVisible: function(el) {
    if (!el) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  },

  isInsideComment: function(el, article) {
    if (!el) return false;
    if (el.matches?.('[role="comment"], [data-testid*="comment" i]')) return true;
    if (el.closest?.('[role="comment"], [data-testid*="comment" i]')) return true;

    const nestedArticle = el.closest?.('[role="article"]');
    if (article && nestedArticle && nestedArticle !== article) {
      const nestedLabel = (nestedArticle.getAttribute('aria-label') || '').toLowerCase();
      if (/comment|bình luận|reply|replies|phản hồi/.test(nestedLabel)) return true;
    }

    const labelled = el.closest?.('[aria-label]');
    const label = (labelled?.getAttribute('aria-label') || '').toLowerCase();
    if (/comment|bình luận|reply|replies|phản hồi/.test(label)) return true;
    const pagelet = el.closest?.('[data-pagelet]')?.getAttribute('data-pagelet') || '';
    return /comment|ufi/i.test(pagelet);
  }
};
