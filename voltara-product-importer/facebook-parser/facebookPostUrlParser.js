// Facebook Post URL and Permalink Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.urlParser = {
  extractFacebookPostPermalink: function(article) {
    if (!article) return "";

    const dbg = window.VoltaraFacebookParser.debug;
    const utils = window.VoltaraFacebookParser.utils;

    const permalinkSelector = 'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[href*="fbid="], a[href*="/permalink.php"], a[href*="/videos/"], a[href*="/reel/"], a[href*="/watch/"], a[href*="/share/p/"], a[href*="/share/r/"], a[href*="/share/v/"]';
    const anchors = Array.from(article.querySelectorAll(permalinkSelector));
    
    let rawUrl = "";

    for (const a of anchors) {
      if (a.closest('[role="comment"], [data-testid*="comment"], div[class*="comment"], [role="complementary"]')) {
        continue;
      }
      
      const href = a.getAttribute("href") || "";
      if (href) {
        rawUrl = href;
        break;
      }
    }

    // Check if the current window location is a permalink of a post
    const currentUrl = window.location.href;
    const isCurrentUrlPermalink = /\/posts\/|\/permalink\/|story_fbid=|fbid=|\/videos\/|\/reel\/|\/watch\/|\/share\/(p|r|v)\//.test(currentUrl);

    if (!rawUrl && isCurrentUrlPermalink) {
      dbg.log("Using current tab location as post permalink fallback.");
      rawUrl = currentUrl;
    }

    if (rawUrl) {
      return utils.cleanFacebookUrl(rawUrl);
    }

    return "";
  },

  extractPostId: function(url) {
    if (!url) return null;
    
    const postIdMatches = [
      /\/posts\/(pfbid[A-Za-z0-9]+)/,
      /\/posts\/(\d+)/,
      /\/permalink\/(\d+)/,
      /story_fbid=(\d+)/,
      /fbid=(\d+)/,
      /\/permalink\.php\?story_fbid=(\d+)/,
      /\/videos\/(\d+)/,
      /[?&]v=(\d+)/,
      /\/photos\/a\.\d+\/(\d+)/,
      /\/reel\/([A-Za-z0-9_-]+)/,
      /\/share\/(?:p|r|v)\/([A-Za-z0-9_-]+)/
    ];
    
    for (const regex of postIdMatches) {
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
};
