// Facebook also uses role="article" for comments. A role alone is therefore
// never sufficient evidence that an element is a feed post.
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.detector = {
  MIN_ACCEPTABLE_SCORE: 35,

  isReelPage: function() {
    return /\/(reel|reels)\/|\/videos\/|\/share\/(r|v)\//i.test(window.location.pathname);
  },

  isPostDetailPage: function() {
    return /\/posts\/|\/permalink\/|\/permalink\.php|\/share\/(p|r|v)\/|\/watch\/|story_fbid=|[?&](fbid|v)=/i.test(
      window.location.pathname + window.location.search
    );
  },

  getFacebookPostDetailRootOnPage: function() {
    if (!this.isPostDetailPage()) return null;

    const isUsableRoot = root => {
      if (!root) return false;
      const rect = root.getBoundingClientRect();
      if (rect.width < 280 || rect.height < 180 || rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
      const hasVideo = !!root.querySelector('video');
      const hasLargeImage = Array.from(root.querySelectorAll('img')).some(img => {
        if (this.isCommentElement(img)) return false;
        const imgRect = img.getBoundingClientRect();
        return imgRect.width >= 180 || imgRect.height >= 180;
      });
      const hasMessage = !!root.querySelector('[data-ad-comet-preview="message"], [data-ad-preview="message"]');
      return hasVideo || hasLargeImage || hasMessage;
    };

    // Facebook opens normal photo/posts links in a modal that frequently has
    // no role="article". Prefer the visible content dialog over the page behind it.
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isUsableRoot);
    if (dialogs.length) {
      return dialogs.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
      })[0];
    }

    const main = document.querySelector('[role="main"], main');
    return isUsableRoot(main) ? main : null;
  },

  isFacebookPostDetailRoot: function(el) {
    if (!el || !this.isPostDetailPage()) return false;
    return this.getFacebookPostDetailRootOnPage() === el;
  },

  getMainFacebookReelOnPage: function() {
    if (!this.isReelPage()) return null;

    const videos = Array.from(document.querySelectorAll('video')).filter(video => {
      if (this.isCommentElement(video)) return false;
      const rect = video.getBoundingClientRect();
      return rect.width >= 180 && rect.height >= 180 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    if (!videos.length) return null;

    const mainVideo = videos.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return (bRect.width * bRect.height) - (aRect.width * aRect.height);
    })[0];

    // Reel pages do not consistently expose role="article". The main/dialog
    // region is the narrowest stable boundary containing the video, caption
    // and author while comment descendants can still be filtered separately.
    const semanticRoot = mainVideo.closest('[role="main"], [role="dialog"]');
    if (semanticRoot) return semanticRoot;

    // Some full-screen Reel variants put the caption overlay beside the
    // immediate video wrapper. Walk upward to a viewport-sized container so
    // the returned root includes both the video and its caption/author layer.
    let current = mainVideo.parentElement;
    let broadRoot = current;
    while (current && current !== document.body && current !== document.documentElement) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= window.innerWidth * 0.55 && rect.height >= window.innerHeight * 0.55) {
        broadRoot = current;
      }
      current = current.parentElement;
    }
    return broadRoot || mainVideo.parentElement;
  },

  isFacebookReelRoot: function(el) {
    if (!el || !this.isReelPage()) return false;
    const reelRoot = this.getMainFacebookReelOnPage();
    return reelRoot === el;
  },

  isCommentElement: function(el) {
    if (!el) return false;
    if (el.matches?.('[role="comment"], [data-testid*="comment" i]')) return true;
    if (el.closest?.('[role="comment"], [data-testid*="comment" i]')) return true;

    const labelledContainer = el.closest?.('[aria-label]');
    const label = (labelledContainer?.getAttribute('aria-label') || '').toLowerCase();
    if (/comment|bình luận|reply|replies|phản hồi/.test(label)) return true;

    const pagelet = el.closest?.('[data-pagelet]')?.getAttribute('data-pagelet') || '';
    return /comment|ufi/i.test(pagelet);
  },

  getPostSignals: function(el) {
    if (!el) return null;
    const message = el.querySelector('[data-ad-comet-preview="message"], [data-ad-preview="message"]');
    const permalink = el.querySelector(
      'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], ' +
      'a[href*="fbid="], a[href*="/videos/"], a[href*="/reel/"], ' +
      'a[href*="/watch/"], a[href*="/share/p/"], a[href*="/share/r/"], a[href*="/share/v/"]'
    );
    const video = el.querySelector('video');
    const largeImage = Array.from(el.querySelectorAll('img')).some(img => {
      if (this.isCommentElement(img)) return false;
      const width = img.clientWidth || img.width || img.naturalWidth || 0;
      const height = img.clientHeight || img.height || img.naturalHeight || 0;
      return width >= 180 || height >= 180;
    });
    const actions = el.querySelector(
      '[aria-label*="Like" i], [aria-label*="Comment" i], [aria-label*="Share" i], ' +
      '[aria-label*="Thích" i], [aria-label*="Bình luận" i], [aria-label*="Chia sẻ" i], ' +
      '[data-testid="UFI2FeedbackLoop/root"]'
    );
    const menu = el.querySelector(
      '[aria-label*="Actions" i], [aria-label*="More" i], ' +
      '[aria-label*="Tùy chọn" i], [aria-label*="Thêm" i]'
    );
    return { message, permalink, video, largeImage, actions, menu };
  },

  isLikelyFeedUnitRoot: function(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.getAttribute('role') === 'article') return true;

    const pagelet = el.getAttribute('data-pagelet') || '';
    const testId = el.getAttribute('data-testid') || '';
    const ft = el.getAttribute('data-ft') || '';
    return /feedunit|feed_unit|timelinefeedunit|story/i.test(pagelet) ||
      /feed.*story|story.*feed|fbfeed_story/i.test(testId) ||
      /top_level_post_id|mf_story_key/i.test(ft);
  },

  findFallbackPostRootFromSignal: function(signalElement) {
    if (!signalElement || this.isCommentElement(signalElement)) return null;

    const semanticRoot = signalElement.closest(
      '[role="article"], [data-pagelet*="FeedUnit" i], [data-pagelet*="feed_unit" i], ' +
      '[data-pagelet*="TimelineFeedUnit" i], [data-testid="fbfeed_story"], ' +
      '[data-ft*="top_level_post_id"], [data-ft*="mf_story_key"]'
    );
    if (semanticRoot && !this.isCommentElement(semanticRoot) && this.countPrimaryPostLinks(semanticRoot) <= 3) {
      return semanticRoot;
    }

    // Facebook regularly removes role="article" from Page timeline cards.
    // Starting from a real post permalink, walk upward until the container also
    // owns the post body/media. This is deliberately bounded so it can never
    // return the whole feed or the page's main region.
    let current = signalElement.parentElement;
    let contentCandidate = null;
    let depth = 0;
    while (current && current !== document.body && current !== document.documentElement && depth < 14) {
      if (current.matches?.('[role="main"], main, [role="dialog"]')) break;
      if (this.isCommentElement(current)) return null;

      const rect = current.getBoundingClientRect();
      const signals = this.getPostSignals(current);
      const hasPostBody = !!signals.message || !!signals.video || signals.largeImage;
      const isCardSized = rect.width >= 300 && rect.height >= 120;
      if (signals.permalink && hasPostBody && isCardSized) {
        contentCandidate = contentCandidate || current;
        if (signals.actions || signals.menu || rect.height >= 260) return current;
      }

      current = current.parentElement;
      depth += 1;
    }
    return contentCandidate;
  },

  getPrimaryPostKey: function(el) {
    if (!el) return "";
    const anchor = el.querySelector(
      'a[href*="/posts/"], a[href*="story_fbid="], a[href*="/permalink/"], ' +
      'a[href*="fbid="], a[href*="/videos/"], a[href*="/reel/"], ' +
      'a[href*="/watch/"], a[href*="/share/p/"], a[href*="/share/r/"], a[href*="/share/v/"]'
    );
    if (!anchor) return "";
    try {
      const url = new URL(anchor.getAttribute('href') || anchor.href, window.location.origin);
      const id = url.searchParams.get('story_fbid') || url.searchParams.get('fbid') || url.searchParams.get('v') || '';
      return `${url.pathname.replace(/\/$/, '')}${id ? `?id=${id}` : ''}`;
    } catch (_) {
      return (anchor.getAttribute('href') || '').split('#')[0];
    }
  },

  countPrimaryPostLinks: function(el) {
    if (!el) return 0;
    const keys = new Set();
    el.querySelectorAll(
      'a[href*="/posts/"], a[href*="story_fbid="], a[href*="/permalink/"], ' +
      'a[href*="fbid="], a[href*="/videos/"], a[href*="/reel/"], ' +
      'a[href*="/watch/"], a[href*="/share/p/"], a[href*="/share/r/"], a[href*="/share/v/"]'
    ).forEach(anchor => {
      try {
        const url = new URL(anchor.getAttribute('href') || anchor.href, window.location.origin);
        const id = url.searchParams.get('story_fbid') || url.searchParams.get('fbid') || url.searchParams.get('v') || '';
        keys.add(`${url.pathname.replace(/\/$/, '')}${id ? `?id=${id}` : ''}`);
      } catch (_) {
        const href = (anchor.getAttribute('href') || '').split('#')[0];
        if (href) keys.add(href);
      }
    });
    return keys.size;
  },

  scoreFacebookPostArticle: function(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return -999;
    if (this.isFacebookReelRoot(el)) return 100;
    if (this.isFacebookPostDetailRoot(el)) return 95;
    if (this.isCommentElement(el)) return -999;
    if (el.closest('.fbDockChatTabFlyout, div[class*="chat" i]')) return -999;
    if (el.closest('[role="complementary"], [role="sidebar"]')) return -999;

    const isSemanticArticle = el.getAttribute('role') === 'article';
    const isFeedUnit = this.isLikelyFeedUnitRoot(el);
    const signals = this.getPostSignals(el);
    if (!isSemanticArticle && !isFeedUnit && !signals.permalink) return -999;

    // Copy a shared/nested article as part of its containing post, not as a
    // second post. This also rejects the usual nested comment structure.
    if (isSemanticArticle && el.parentElement?.closest?.('[role="article"]')) return -999;

    let score = 10;
    if (isSemanticArticle || isFeedUnit) score += 10;
    if (signals.message) score += 45;
    if (signals.permalink) score += 25;
    if (signals.video || signals.largeImage) score += 20;
    if (signals.actions) score += 15;
    if (signals.menu) score += 5;

    // Media-only posts have no message marker, so accept those only when a
    // real post permalink and a large attachment are both present.
    if (!signals.message && !(signals.permalink && (signals.video || signals.largeImage))) return -999;
    return score;
  },

  isFacebookPostEl: function(el) {
    return this.scoreFacebookPostArticle(el) >= this.MIN_ACCEPTABLE_SCORE;
  },

  findFacebookPostsOnPage: function() {
    const candidates = new Set(document.querySelectorAll(
      'div[role="article"], article[role="article"], ' +
      '[data-pagelet*="FeedUnit" i], [data-pagelet*="feed_unit" i], ' +
      '[data-pagelet*="TimelineFeedUnit" i], [data-testid="fbfeed_story"], ' +
      '[data-ft*="top_level_post_id"], [data-ft*="mf_story_key"]'
    ));
    document.querySelectorAll('[data-ad-comet-preview="message"], [data-ad-preview="message"]').forEach(message => {
      const root = this.findFallbackPostRootFromSignal(message);
      if (root) candidates.add(root);
    });
    document.querySelectorAll(
      'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], ' +
      'a[href*="fbid="], a[href*="/videos/"], a[href*="/reel/"], ' +
      'a[href*="/watch/"], a[href*="/share/p/"], a[href*="/share/r/"], a[href*="/share/v/"]'
    ).forEach(permalink => {
      const root = this.findFallbackPostRootFromSignal(permalink);
      if (root) candidates.add(root);
    });

    const valid = Array.from(candidates).filter(el => this.isFacebookPostEl(el));

    // A Page timeline can expose both a FeedUnit wrapper and its role=article
    // child for the same post. Keep the tightest root for identical permalinks;
    // otherwise media from neighbouring feed cards leaks into the result.
    const byKey = new Map();
    const withoutKey = [];
    valid.forEach(el => {
      const key = this.getPrimaryPostKey(el);
      if (!key) {
        withoutKey.push(el);
        return;
      }
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, el);
        return;
      }
      const existingArea = existing.getBoundingClientRect().width * existing.getBoundingClientRect().height;
      const nextArea = el.getBoundingClientRect().width * el.getBoundingClientRect().height;
      if (nextArea > 0 && (existingArea <= 0 || nextArea < existingArea)) byKey.set(key, el);
    });

    const deduped = [...byKey.values(), ...withoutKey];
    return deduped.filter((el, index, all) => !all.some((other, otherIndex) => {
      if (otherIndex === index || !other.contains(el)) return false;
      return this.getPrimaryPostKey(other) !== this.getPrimaryPostKey(el);
    }));
  },

  getMainFacebookPostOnPage: function() {
    // On a permalink/modal page the detail dialog must always win. Feed cards
    // behind the modal stay mounted in Facebook's DOM and must never be parsed
    // as part of the opened post.
    const reelRoot = this.getMainFacebookReelOnPage();
    if (reelRoot) return reelRoot;
    const detailRoot = this.getFacebookPostDetailRootOnPage();
    if (detailRoot) return detailRoot;

    const posts = this.findFacebookPostsOnPage();
    if (!posts.length) return null;
    const viewportCenter = window.innerHeight / 2;
    return posts.map(post => {
      const rect = post.getBoundingClientRect();
      return {
        post,
        visible: rect.bottom > 0 && rect.top < window.innerHeight,
        distance: Math.abs((rect.top + rect.bottom) / 2 - viewportCenter),
        score: this.scoreFacebookPostArticle(post)
      };
    }).sort((a, b) => Number(b.visible) - Number(a.visible) || b.score - a.score || a.distance - b.distance)[0].post;
  },

  findPostArticleFromClickedElement: function(clickedElement) {
    const article = clickedElement?.closest?.('[role="article"]');
    return article && this.isFacebookPostEl(article) ? article : null;
  }
};
