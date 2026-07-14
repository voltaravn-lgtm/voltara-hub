// Debug and visualization functions for Voltara Facebook Parser
window.VoltaraFacebookParser = window.VoltaraFacebookParser || {};

window.VoltaraFacebookParser.debug = {
  enabled: true,

  log: function(msg, ...args) {
    if (this.enabled) {
      console.log(`%c[Voltara FB Debug]%c ${msg}`, "color: #1877f2; font-weight: bold;", "color: inherit;", ...args);
    }
  },

  warn: function(msg, ...args) {
    if (this.enabled) {
      console.warn(`%c[Voltara FB Debug Warning]%c ${msg}`, "color: #eab308; font-weight: bold;", "color: inherit;", ...args);
    }
  },

  highlightArticle: function(el, score, isAccepted = true) {
    if (!this.enabled || !el) return;
    try {
      const originalOutline = el.style.outline;
      const originalPosition = el.style.position;
      
      el.style.outline = isAccepted ? "3px solid #10b981" : "3px dashed #ef4444";
      if (!originalPosition || originalPosition === "static") {
        el.style.position = "relative";
      }

      // Add a small temporary floating score tag if accepted
      const tagId = "voltara-debug-score-tag";
      let existingTag = el.querySelector(`#${tagId}`);
      if (existingTag) existingTag.remove();

      const tag = document.createElement("div");
      tag.id = tagId;
      tag.style.position = "absolute";
      tag.style.top = "10px";
      tag.style.right = "10px";
      tag.style.background = isAccepted ? "#10b981" : "#ef4444";
      tag.style.color = "white";
      tag.style.padding = "4px 8px";
      tag.style.borderRadius = "4px";
      tag.style.fontFamily = "monospace";
      tag.style.fontSize = "12px";
      tag.style.fontWeight = "bold";
      tag.style.zIndex = "99999";
      tag.textContent = `Score: ${score} (${isAccepted ? "OK" : "REJECTED"})`;
      
      el.appendChild(tag);

      // Revert after 5 seconds
      setTimeout(() => {
        if (el) {
          el.style.outline = originalOutline;
          const currentTag = el.querySelector(`#${tagId}`);
          if (currentTag) currentTag.remove();
        }
      }, 5000);
    } catch (e) {
      this.warn("Error highlighting article:", e);
    }
  },

  debugFacebookArticle: function(article, result) {
    if (!this.enabled || !article) return;
    
    console.groupCollapsed(`%c[Voltara FB Scraper Audit] Post Score: ${result.debug.articleScore} %c(${result.author?.name || "Unknown Author"})`, "background: #1877f2; color: white; padding: 2px 5px; border-radius: 3px;", "font-weight: normal;");
    this.log("Detection Method:", result.debug.detectionMethod);
    this.log("Score Detail:", result.debug.articleScore);
    this.log("Permalink:", result.sourceUrl);
    this.log("Post ID:", result.sourcePostId);
    this.log("Author:", result.author);
    this.log("Caption length:", result.caption?.length || 0);
    this.log("Caption Text Sample:", result.caption ? result.caption.substring(0, 150) + "..." : "[NO CAPTION]");
    this.log("Media Count:", result.media?.length || 0);
    this.log("Media Items:", result.media);
    console.groupEnd();
  }
};
