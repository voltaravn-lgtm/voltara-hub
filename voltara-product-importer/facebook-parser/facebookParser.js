// Core Orchestrator for Voltara Facebook Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.parseFacebookPost = async function(articleElement, options = {}) {
  const dbg = this.debug;
  const detector = this.detector;
  const textParser = this.textParser;
  const mediaParser = this.mediaParser;
  const videoParser = this.videoParser;
  const authorParser = this.authorParser;
  const urlParser = this.urlParser;

  if (!articleElement) {
    throw new Error("Không có element bài viết hợp lệ để scrape.");
  }

  const score = detector.scoreFacebookPostArticle(articleElement);
  if (score < detector.MIN_ACCEPTABLE_SCORE) {
    throw new Error(`Độ tin cậy của bài viết không đạt chuẩn (Score: ${score}/${detector.MIN_ACCEPTABLE_SCORE}). Hãy mở bài viết chi tiết hoặc chọn đúng khung bài viết.`);
  }

  dbg.log("Starting scrape on article with score:", score);

  // 1. Expand "Xem thêm" / "See more" if active
  if (options.expand !== false) {
    try {
      const utils = this.utils;
      // Facebook places "See more" either inside the message or as its sibling.
      // Run a few rounds because expanding one block can reveal another button.
      for (let round = 0; round < 3; round++) {
        const buttons = Array.from(articleElement.querySelectorAll(
          'div[role="button"], span[role="button"], a[role="button"], button, span, a'
        )).filter(btn => {
          const text = (btn.innerText || btn.textContent || "").trim();
          const exactSeeMore = text === "Xem thêm" || text === "See more" || text === "See More";
          const visible = !!(btn.offsetWidth || btn.offsetHeight || btn.getClientRects().length);
          return exactSeeMore && visible && !utils.isInsideComment(btn, articleElement);
        });

        if (!buttons.length) break;
        dbg.log(`Expanding ${buttons.length} 'See more' control(s), round ${round + 1}.`);
        buttons.slice(0, 5).forEach(btn => btn.click());
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (e) {
      dbg.warn("Error expanding Facebook post body:", e);
    }
  }

  // 2. Extract Permalink & Post ID
  const sourceUrl = urlParser.extractFacebookPostPermalink(articleElement) || window.location.href;
  const sourcePostId = urlParser.extractPostId(sourceUrl);

  // 3. Extract Author Information
  const author = authorParser.extractFacebookAuthor(articleElement);

  // 4. Extract Caption text
  const caption = textParser.extractFacebookCaption(articleElement);

  // 5. Extract Media (Images & Videos)
  const isReelRoot = detector.isFacebookReelRoot?.(articleElement) === true;
  // A full-screen Reel root also contains thumbnails from next/previous and
  // suggested posts. They are not attachments of the current Reel.
  const images = isReelRoot ? [] : mediaParser.extractFacebookPostImages(articleElement);
  const videos = videoParser.extractFacebookPostVideos(articleElement);

  // Merge media lists
  const media = [...videos, ...images];
  // Compatibility with older Hub deployments that required non-empty text
  // even for a valid media-only Reel. Normally the real caption is used.
  const finalCaption = caption || (media.length > 0
    ? `Video Facebook từ ${author.name || "trang nguồn"}`
    : "");

  // 6. Extract Published Date (if possible)
  let publishedAt = null;
  try {
    // Try to get title or hover text from timestamp anchors
    const timeEl = articleElement.querySelector('span.x1rg5g18, span.xt0psk2 a, a[role="link"] span[id*="timestamp"], a[role="link"] span[class*="timestamp"], abbr');
    if (timeEl) {
      const parentAnchor = timeEl.closest('a');
      const titleText = parentAnchor?.getAttribute("title") || timeEl.getAttribute("title") || "";
      if (titleText) {
        publishedAt = titleText.trim();
      } else {
        const utime = parentAnchor?.getAttribute("data-utime") || timeEl.getAttribute("data-utime") || "";
        if (utime) {
          publishedAt = new Date(parseInt(utime) * 1000).toISOString();
        }
      }
    }
  } catch (e) {
    dbg.warn("Error resolving publication timestamp:", e);
  }

  // Determine detection method
  let detectionMethod = "scored-div-tree";
  if (detector.isFacebookReelRoot?.(articleElement)) {
    detectionMethod = "reel-viewer";
  } else if (detector.isFacebookPostDetailRoot?.(articleElement)) {
    detectionMethod = "post-detail-dialog";
  } else if (articleElement.getAttribute("role") === "article") {
    detectionMethod = "role-article";
  }

  const result = {
    source: "facebook",
    sourceUrl: sourceUrl,
    sourcePostId: sourcePostId,
    author: author,
    caption: finalCaption,
    media: media,
    publishedAt: publishedAt,
    debug: {
      parserVersion: "1.5.3",
      detectionMethod: detectionMethod,
      articleScore: score
    },
    // Backward compatibility fields
    fbPostId: sourcePostId || "fb-" + Math.random().toString(36).substring(2, 11),
    pageName: author.name || "Trang cá nhân/Cộng đồng Facebook",
    postUrl: sourceUrl,
    originalCaption: finalCaption,
    editedCaption: finalCaption
  };

  dbg.debugFacebookArticle(articleElement, result);
  dbg.highlightArticle(articleElement, score, true);

  return result;
};
