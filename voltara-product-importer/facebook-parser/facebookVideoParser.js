// Facebook Video Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.videoParser = {
  extractFacebookPostVideos: function(article) {
    if (!article) return [];

    const dbg = window.VoltaraFacebookParser.debug;
    const utils = window.VoltaraFacebookParser.utils;
    const videos = [];
    const rawVideoEls = Array.from(article.querySelectorAll('video')).filter(v => {
      if (utils.isInsideComment(v, article)) return false;
      return !v.closest('[role="complementary"], [role="sidebar"], div[class*="sidebar" i], div[id*="sidebar"]');
    });
    const visibleVideoEls = rawVideoEls.filter(v => {
      const rect = v.getBoundingClientRect();
      return rect.width >= 120 && rect.height >= 120 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    let videoEls = visibleVideoEls.length ? visibleVideoEls : rawVideoEls;

    // Reel viewers commonly keep a second hidden/preloaded <video>. Only the
    // largest visible player belongs to the Reel currently being copied.
    if (/\/(reel|reels)\//i.test(window.location.pathname) && videoEls.length > 1) {
      videoEls = videoEls.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
      }).slice(0, 1);
    }
    
    dbg.log(`Found ${videoEls.length} video elements inside the article.`);

    videoEls.forEach(v => {
      let videoUrl = v.currentSrc || v.src ||
        v.getAttribute("data-video-url") || v.getAttribute("data-src") || "";
      
      // If empty, search inside child <source> elements
      if (!videoUrl) {
        const source = v.querySelector('source');
        if (source) {
          videoUrl = source.src || source.getAttribute("data-src") || "";
        }
      }

      if (!videoUrl) {
        const dataContainer = v.closest('[data-video-url], [data-video-src]');
        videoUrl = dataContainer?.getAttribute('data-video-url') ||
          dataContainer?.getAttribute('data-video-src') || "";
      }

      let isBlob = false;
      let finalUrl = videoUrl;

      // Handle blob URL restrictions
      if (videoUrl.startsWith("blob:")) {
        isBlob = true;
        // Do not store local blob URL since it is context-dependent and will fail later
        finalUrl = ""; 
      }

      const thumbnailUrl = v.getAttribute("poster") || null;
      const width = v.videoWidth || v.clientWidth || v.width || null;
      const height = v.videoHeight || v.clientHeight || v.height || null;

      const videoData = {
        type: "video",
        url: finalUrl,
        thumbnailUrl: thumbnailUrl,
        width: width > 0 ? width : null,
        height: height > 0 ? height : null
      };

      if (isBlob || !finalUrl) {
        videoData.videoUrlType = "blob";
        // A MediaSource blob only exists in the current Facebook tab and
        // cannot be reused by the Hub. Preserve the Reel/post permalink as a
        // stable fallback instead of incorrectly saving a random image URL.
        videoData.url = window.location.href;
        videoData.message = "Đã nhận diện video nhưng chưa lấy được URL tải trực tiếp.";
      }

      const duplicate = videos.some(existing => {
        if (videoData.url && existing.url === videoData.url) return true;
        return videoData.thumbnailUrl && existing.thumbnailUrl === videoData.thumbnailUrl;
      });
      if (!duplicate) videos.push(videoData);
    });

    return videos;
  }
};
