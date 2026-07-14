// Popup logic for Voltara Product Importer

let currentScrapedProduct = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const statusBadge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");
  
  const panelInvalidPage = document.getElementById("panel-invalid-page");
  const panelValidPage = document.getElementById("panel-valid-page");
  const panelBulkPage = document.getElementById("panel-bulk-page");
  
  const productImg = document.getElementById("product-img");
  const productSkuTag = document.getElementById("product-sku-tag");
  const imageCountBadge = document.getElementById("image-count-badge");
  const productName = document.getElementById("product-name");
  const productPrice = document.getElementById("product-price");
  const productOriginalPrice = document.getElementById("product-original-price");
  const productSellerName = document.getElementById("product-seller-name");

  const btnScrape = document.getElementById("btn-scrape");
  const btnPreview = document.getElementById("btn-preview");
  const btnSubmit = document.getElementById("btn-submit");
  const btnOpenHubInvalid = document.getElementById("btn-open-hub-invalid");
  const btnOpenHubFooter = document.getElementById("btn-open-hub-footer");
  const btnOpenOptions = document.getElementById("btn-open-options");

  // Bulk Panel Elements
  const bulkCount = document.getElementById("bulk-count");
  const btnScanAgain = document.getElementById("btn-scan-again");
  const bulkProductsList = document.getElementById("bulk-products-list");
  const bulkProgressPanel = document.getElementById("bulk-progress-panel");
  const bulkProgressText = document.getElementById("bulk-progress-text");
  const bulkProgressBar = document.getElementById("bulk-progress-bar");
  const bulkStatusMsg = document.getElementById("bulk-status-msg");
  const btnSubmitBulk = document.getElementById("btn-submit-bulk");

  // Preview elements
  const previewModal = document.getElementById("preview-modal");
  const btnClosePreview = document.getElementById("btn-close-preview");
  const previewName = document.getElementById("preview-name");
  const previewPrice = document.getElementById("preview-price");
  const previewOriginal = document.getElementById("preview-original");
  const previewSeller = document.getElementById("preview-seller");
  const previewImagesContainer = document.getElementById("preview-images-container");
  const previewVariantsContainer = document.getElementById("preview-variants-container");
  const previewDesc = document.getElementById("preview-desc");

  // Feedback elements
  const panelFeedback = document.getElementById("panel-feedback");
  const feedbackIconContainer = document.getElementById("feedback-icon-container");
  const feedbackTitle = document.getElementById("feedback-title");
  const feedbackDesc = document.getElementById("feedback-desc");
  const btnFeedbackRetry = document.getElementById("btn-feedback-retry");
  const btnFeedbackClose = document.getElementById("btn-feedback-close");

  let currentBulkProducts = [];

  // Facebook UI Elements
  const panelFacebookPage = document.getElementById("panel-facebook-page");
  const fbPageName = document.getElementById("fb-page-name");
  const fbMediaCount = document.getElementById("fb-media-count");
  const fbCaptionPreview = document.getElementById("fb-caption-preview");
  const fbPostIdTag = document.getElementById("fb-post-id-tag");
  const btnScrapeFacebook = document.getElementById("btn-scrape-facebook");
  const btnSubmitFacebook = document.getElementById("btn-submit-facebook");

  let currentScrapedFacebookPost = null;

  // 1. Detect if current page is Shopee or Facebook
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (activeTab && activeTab.url && activeTab.url.includes("shopee.vn")) {
    updateStatusBadge(true, "Đã nhận diện Shopee");
    detectPageAndLoad(activeTab.id);
  } else if (activeTab && activeTab.url && activeTab.url.includes("facebook.com")) {
    updateStatusBadge(true, "Đã nhận diện Facebook");
    detectFacebookPageAndLoad(activeTab.id);
  } else {
    // Invalid domain
    updateStatusBadge(false, "Không hỗ trợ trang này");
    panelValidPage.classList.add("hidden");
    panelBulkPage.classList.add("hidden");
    panelFacebookPage.classList.add("hidden");
    panelInvalidPage.classList.remove("hidden");
  }

  // Facebook Actions
  if (btnScrapeFacebook) {
    btnScrapeFacebook.addEventListener("click", () => {
      if (activeTab) {
        detectFacebookPageAndLoad(activeTab.id);
      }
    });
  }

  if (btnSubmitFacebook) {
    btnSubmitFacebook.addEventListener("click", () => {
      if (currentScrapedFacebookPost) {
        submitFacebookPost(currentScrapedFacebookPost);
      }
    });
  }

  async function detectFacebookPageAndLoad(tabId) {
    panelInvalidPage.classList.add("hidden");
    panelValidPage.classList.add("hidden");
    panelBulkPage.classList.add("hidden");
    panelFacebookPage.classList.remove("hidden");
    
    updateStatusBadge(true, "Đang quét bài viết...");
    fbCaptionPreview.innerText = "Đang kết nối đến trang Facebook và phân tích nội dung...";
    
    chrome.tabs.sendMessage(tabId, { type: "SCRAPE_FACEBOOK_POST" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("[Voltara] Facebook content script not loaded or disconnected. Using sample content and prompting reload.");
        const fallbackPost = {
          fbPostId: "fb-" + Math.random().toString(36).substr(2, 9),
          pageName: "Trang cá nhân/Cộng đồng Facebook",
          postUrl: activeTab.url,
          originalCaption: "⚠️ [Yêu cầu tải lại trang Facebook (F5) để kích hoạt quét thật]\n\nTiện ích vừa được cài đặt hoặc cập nhật. Hãy tải lại (F5) trang Facebook để kích hoạt toàn bộ công cụ tự động Copy/Quét và hiển thị nút Copy trực tiếp trên các bài viết.\n\nDưới đây là nội dung mẫu để bạn kiểm tra gửi bài viết về Hub:\n\n⚡ SIÊU PHẨM MÁY MÀI GÓC VOLTARA 21V - ĐÁP ỨNG MỌI NHU CẦU CỦA ANH EM THỢ!\n\n🔹 Motor Brushless không chổi than mạnh mẽ, êm ái, tăng 200% tuổi thọ máy.\n🔹 Có điều tốc 3 cấp độ thông minh phù hợp cho cả cắt sắt, mài nhám, đánh bóng gỗ.\n🔹 Chân pin Voltara 21V thông dụng, dùng chung hệ sinh thái máy siết bu lông, cưa xích.\n🔹 Thân máy thon gọn, bọc cao su chống trượt đầm tay và an toàn tuyệt đối.",
          media: [
            { type: "image", url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600" },
            { type: "image", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600" }
          ]
        };
        renderFacebookPost(fallbackPost);
        return;
      }
      
      if (response && response.success && response.data) {
        renderFacebookPost(response.data);
      } else {
        updateStatusBadge(false, "Không lấy được bài viết");
        fbCaptionPreview.innerText = "Không thể đọc nội dung bài viết. Vui lòng tải lại trang Facebook.";
      }
    });
  }

  function renderFacebookPost(post) {
    currentScrapedFacebookPost = post;
    fbPageName.innerText = post.pageName || "Trang cá nhân/Nhóm Facebook";
    fbMediaCount.innerText = `${post.media ? post.media.length : 0} ảnh/video`;
    fbCaptionPreview.innerText = post.originalCaption || "Không có nội dung bài viết.";
    fbPostIdTag.innerText = `ID: ${post.fbPostId}`;
    updateStatusBadge(true, "Đã đọc bài viết FB");
  }

  async function submitFacebookPost(post) {
    const settings = await chrome.storage.local.get(["hubUrl", "token"]);
    if (!settings.hubUrl || !settings.token) {
      showFeedback(
        "warning",
        "Vui lòng cấu hình kết nối trước.",
        "Bạn chưa cấu hình Địa chỉ Voltara Product Hub hoặc Mã kết nối. Vui lòng mở cài đặt để thiết lập."
      );
      btnFeedbackRetry.classList.add("hidden");
      return;
    }

    showFeedback(
      "loading",
      "Đang gửi bài viết...",
      "Bài viết Facebook đang được phân tích và gửi về Voltara Product Hub."
    );
    btnFeedbackRetry.classList.add("hidden");

    chrome.runtime.sendMessage({
      type: "IMPORT_FACEBOOK_POST",
      postData: post
    }, (result) => {
      if (chrome.runtime.lastError) {
        showFeedback(
          "error",
          "Lỗi gửi tin",
          "Không thể gửi bài viết tới tiến trình chạy ngầm. Vui lòng thử lại."
        );
        btnFeedbackRetry.classList.remove("hidden");
        return;
      }

      if (result && result.success) {
        showFeedback(
          "success",
          "Gửi thành công!",
          "Đã gửi bài viết Facebook về Voltara Product Hub thành công. Hãy mở Hub để kiểm tra chỉnh sửa bài viết."
        );
        btnFeedbackRetry.classList.add("hidden");
      } else {
        showFeedback(
          "error",
          "Gửi bài viết thất bại",
          result ? result.error : "Không thể kết nối đến Voltara Hub."
        );
        btnFeedbackRetry.classList.remove("hidden");
      }
    });
  }

  // Button actions
  btnScrape.addEventListener("click", () => {
    if (activeTab) {
      detectPageAndLoad(activeTab.id);
    }
  });

  btnPreview.addEventListener("click", () => {
    if (currentScrapedProduct) {
      showPreviewModal(currentScrapedProduct);
    }
  });

  btnSubmit.addEventListener("click", () => {
    if (currentScrapedProduct) {
      const inputWeight = document.getElementById("input-product-weight");
      if (inputWeight) {
        currentScrapedProduct.weight = parseInt(inputWeight.value, 10) || 500;
      }
      submitProduct(currentScrapedProduct);
    }
  });

  btnClosePreview.addEventListener("click", () => {
    previewModal.classList.add("hidden");
  });

  btnFeedbackClose.addEventListener("click", () => {
    panelFeedback.classList.add("hidden");
    if (activeTab && activeTab.url && activeTab.url.includes("facebook.com")) {
      panelFacebookPage.classList.remove("hidden");
    } else if (currentBulkProducts.length > 0) {
      panelBulkPage.classList.remove("hidden");
    } else {
      panelValidPage.classList.remove("hidden");
    }
  });

  btnFeedbackRetry.addEventListener("click", () => {
    panelFeedback.classList.add("hidden");
    if (currentScrapedProduct) {
      submitProduct(currentScrapedProduct);
    }
  });

  // Navigation actions
  const handleOpenHub = async () => {
    const settings = await chrome.storage.local.get("hubUrl");
    const url = settings.hubUrl || "https://shopee.vn";
    chrome.tabs.create({ url: url });
  };

  btnOpenHubInvalid.addEventListener("click", handleOpenHub);
  btnOpenHubFooter.addEventListener("click", handleOpenHub);
  
  btnOpenOptions.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  });

  btnScanAgain.addEventListener("click", () => {
    if (activeTab) {
      detectPageAndLoad(activeTab.id);
    }
  });

  btnSubmitBulk.addEventListener("click", async () => {
    if (currentBulkProducts.length === 0) return;

    // Check settings first
    const settings = await chrome.storage.local.get(["hubUrl", "token"]);
    if (!settings.hubUrl || !settings.token) {
      alert("Vui lòng cấu hình kết nối Voltara Hub trước khi gửi!");
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
      return;
    }

    // Prepare UI
    btnSubmitBulk.disabled = true;
    btnScanAgain.disabled = true;
    bulkProgressPanel.classList.remove("hidden");
    
    let successCount = 0;
    let failCount = 0;
    const total = currentBulkProducts.length;

    updateBulkProgress(0, total, "Bắt đầu lấy thông tin hàng loạt...");

    for (let i = 0; i < total; i++) {
      const product = currentBulkProducts[i];
      const itemEl = document.getElementById(`bulk-item-${i}`);
      const statusEl = itemEl ? itemEl.querySelector(".bulk-item-status") : null;

      if (statusEl) {
        statusEl.innerText = "Đang mở trang";
        statusEl.style.color = "#2563eb";
        statusEl.style.background = "#eff6ff";
      }

      updateBulkProgress(i, total, `Đang tải: ${product.name}`);

      try {
        const productDetails = await extractProductFromBackgroundTab(product, (statusText) => {
          if (statusEl) {
            statusEl.innerText = statusText;
            if (statusText === "Đang mở trang") {
              statusEl.style.color = "#2563eb";
              statusEl.style.background = "#eff6ff";
            } else if (statusText === "Đang chờ tải") {
              statusEl.style.color = "#7c3aed";
              statusEl.style.background = "#f5f3ff";
            } else if (statusText === "Đang đọc dữ liệu") {
              statusEl.style.color = "#db2777";
              statusEl.style.background = "#fdf2f8";
            } else if (statusText.startsWith("Thử lại")) {
              statusEl.style.color = "#ea580c";
              statusEl.style.background = "#fff7ed";
            }
          }
        });

        if (!productDetails || !productDetails.name) {
          throw new Error("Không lấy được dữ liệu chi tiết sản phẩm");
        }

        // ABSOLUTE SAFETY FALLBACK: If detail scraping missed price or images, use values from the list scraper
        if ((productDetails.price === null || productDetails.price === undefined || productDetails.price === 0) && product.price) {
          productDetails.price = product.price;
        }
        if ((!productDetails.images || productDetails.images.length === 0) && product.image) {
          productDetails.images = [product.image];
        }

        // Apply QUY TẮC XÁC NHẬN (Validation Rules)
        const hasPrice = productDetails.price !== null && productDetails.price !== undefined && productDetails.price > 0;
        const hasImages = Array.isArray(productDetails.images) && productDetails.images.length > 0;
        const isCaptchaResult = /\/verify\/captcha|anti_bot_tracking_id|captcha/i.test(productDetails.sourceUrl || "");
        const isComplete = (hasPrice || hasImages) && !isCaptchaResult;

        if (isComplete) {
          if (statusEl) {
            statusEl.innerText = "Đã lấy đủ";
            statusEl.style.color = "#10b981";
            statusEl.style.background = "#ecfdf5";
          }

          // Import product to Hub
          const importResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              type: "IMPORT_PRODUCT",
              productData: productDetails
            }, (res) => {
              resolve(res || { success: false, error: "Lỗi kết nối background" });
            });
          });

          if (importResult && importResult.success) {
            successCount++;
          } else {
            throw new Error(importResult?.error || "Gửi lên Hub thất bại");
          }
        } else {
          // Lacks price or images -> Partial (Thiếu dữ liệu)
          productDetails.status = "partial";
          failCount++;
          if (statusEl) {
            statusEl.innerText = "Thiếu dữ liệu";
            statusEl.style.color = "#d97706";
            statusEl.style.background = "#fef3c7";
          }
        }

      } catch (err) {
        console.error(`Error scraping item ${i}:`, err);
        failCount++;
        if (statusEl) {
          statusEl.innerText = "Lỗi";
          statusEl.style.color = "#ef4444";
          statusEl.style.background = "#fef2f2";
          statusEl.title = err.message;
        }
      }

      // Small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    // Final finish state
    updateBulkProgress(total, total, `Hoàn thành! Thành công: ${successCount}, Thất bại: ${failCount}`);
    btnScanAgain.disabled = false;
    btnSubmitBulk.disabled = false;
    
    alert(`Hoàn tất import hàng loạt!\n- Thành công: ${successCount} sản phẩm\n- Thất bại: ${failCount} sản phẩm`);
  });

  // Helpers
  function updateStatusBadge(isValid, text) {
    statusBadge.className = "status-badge " + (isValid ? "status-valid" : "status-invalid");
    statusText.innerText = text;
  }

  function updateBulkProgress(current, total, message) {
    bulkProgressText.innerText = `${current} / ${total}`;
    const percent = total > 0 ? (current / total) * 100 : 0;
    bulkProgressBar.style.width = `${percent}%`;
    bulkStatusMsg.innerText = message;
  }

  function detectPageAndLoad(tabId) {
    updateStatusBadge(true, "Đang quét trang...");
    btnScrape.disabled = true;
    btnScrape.innerHTML = `<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M4 12a8 8 0 0 1 8-8"></path></svg> ĐANG QUÉT...`;

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).then(() => {
      chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_PRODUCTS" }, (response) => {
        btnScrape.disabled = false;
        btnScrape.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg> LẤY DỮ LIỆU MỚI`;

        if (chrome.runtime.lastError) {
          console.warn("Message sending error:", chrome.runtime.lastError);
          showScrapeError("Vui lòng tải lại trang Shopee và thử lại.");
          return;
        }

        if (response && response.success && response.data) {
          const pageData = response.data;
          
          if (pageData.type === "product") {
            // SINGLE PRODUCT PAGE
            panelValidPage.classList.remove("hidden");
            panelBulkPage.classList.add("hidden");
            updateStatusBadge(true, "Chi tiết sản phẩm");
            
            const product = pageData.product;
            if (!product || !product.name) {
              showScrapeError("Đây không phải trang chi tiết sản phẩm hoặc không đọc được tên sản phẩm.");
              return;
            }
            currentScrapedProduct = product;
            renderProductCard(product);
            btnPreview.disabled = false;
            btnSubmit.disabled = false;
          } else {
            // SHOP / LIST PAGE
            panelValidPage.classList.add("hidden");
            panelBulkPage.classList.remove("hidden");
            updateStatusBadge(true, "Cửa hàng / Danh sách");
            
            currentBulkProducts = pageData.products || [];
            renderBulkProducts(currentBulkProducts);
          }
        } else {
          showScrapeError(response ? response.error : "Không thể đọc dữ liệu trang này.");
        }
      });
    }).catch(err => {
      console.error("Script injection failed:", err);
      btnScrape.disabled = false;
      btnScrape.innerHTML = `LẤY DỮ LIỆU MỚI`;
      showScrapeError("Không thể chạy bộ quét trên trang này.");
    });
  }

  function renderBulkProducts(products) {
    bulkCount.innerText = products.length;
    bulkProductsList.innerHTML = "";
    bulkProgressPanel.classList.add("hidden");
    btnSubmitBulk.disabled = products.length === 0;

    if (products.length === 0) {
      bulkProductsList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 12px; font-size: 11px;">Không tìm thấy sản phẩm nào trên trang hiện tại. Vui lòng cuộn chuột xuống để tải thêm sản phẩm rồi ấn "Quét lại trang".</div>`;
      return;
    }

    products.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "bulk-item flex items-center gap-2";
      item.id = `bulk-item-${idx}`;
      item.style.cssText = "display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f8fafc; padding: 4px 0; font-size: 11px;";

      // Image
      const img = document.createElement("img");
      img.src = p.image || "placeholder.png";
      img.style.cssText = "width: 24px; height: 24px; border-radius: 2px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0;";
      
      // Name
      const name = document.createElement("span");
      name.innerText = p.name;
      name.style.cssText = "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; color: #0f172a;";

      // Price
      const priceSpan = document.createElement("span");
      priceSpan.className = "bulk-item-price";
      if (p.price) {
        priceSpan.innerText = p.price.toLocaleString("vi-VN") + " đ";
        priceSpan.style.cssText = "font-weight: 600; color: #16a34a; flex-shrink: 0; padding-right: 4px;";
      } else {
        priceSpan.innerText = "---";
        priceSpan.style.cssText = "color: #94a3b8; flex-shrink: 0; padding-right: 4px;";
      }

      // Status
      const status = document.createElement("span");
      status.className = "bulk-item-status";
      status.innerText = "Chờ gửi";
      status.style.cssText = "font-size: 10px; font-weight: 700; color: #64748b; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; flex-shrink: 0;";

      item.appendChild(img);
      item.appendChild(name);
      item.appendChild(priceSpan);
      item.appendChild(status);
      bulkProductsList.appendChild(item);
    });
  }

  function triggerScrape(tabId) {
    detectPageAndLoad(tabId);
  }

  function renderProductCard(product) {
    productName.innerText = product.name;
    
    if (product.price) {
      productPrice.innerText = product.price.toLocaleString("vi-VN") + " đ";
    } else {
      productPrice.innerText = "Chưa cập nhật giá";
    }

    if (product.originalPrice) {
      productOriginalPrice.innerText = product.originalPrice.toLocaleString("vi-VN") + " đ";
      productOriginalPrice.classList.remove("hidden");
    } else {
      productOriginalPrice.innerText = "";
      productOriginalPrice.classList.add("hidden");
    }

    if (product.sku) {
      productSkuTag.innerText = product.sku;
      productSkuTag.classList.remove("hidden");
    } else {
      productSkuTag.classList.add("hidden");
    }

    imageCountBadge.innerText = `${product.images.length} ảnh`;
    
    if (product.images && product.images.length > 0) {
      productImg.src = product.images[0];
    } else {
      productImg.src = "placeholder.png";
    }

    productSellerName.innerText = product.seller?.name || "Cửa hàng Shopee";

    const inputWeight = document.getElementById("input-product-weight");
    if (inputWeight) {
      inputWeight.value = product.weight !== undefined ? product.weight : 500;
    }
  }

  function showScrapeError(message) {
    productName.innerText = "Lỗi lấy dữ liệu!";
    productPrice.innerText = "---";
    productOriginalPrice.innerText = "";
    productSellerName.innerText = "---";
    productImg.src = "placeholder.png";
    imageCountBadge.innerText = "0 ảnh";
    productSkuTag.classList.add("hidden");
    
    btnPreview.disabled = true;
    btnSubmit.disabled = true;
    
    alert(message);
  }

  function showPreviewModal(product) {
    previewName.innerText = product.name;
    previewPrice.innerText = product.price ? product.price.toLocaleString("vi-VN") + " đ" : "Chưa cập nhật";
    previewOriginal.innerText = product.originalPrice ? product.originalPrice.toLocaleString("vi-VN") + " đ" : "";
    previewSeller.innerText = product.seller?.name || "Cửa hàng Shopee";
    
    // Clear & load images
    previewImagesContainer.innerHTML = "";
    if (product.images && product.images.length > 0) {
      product.images.forEach(imgUrl => {
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = "preview img";
        previewImagesContainer.appendChild(img);
      });
    } else {
      previewImagesContainer.innerHTML = `<span class="text-slate-400">Không có hình ảnh</span>`;
    }

    // Clear & load variants
    previewVariantsContainer.innerHTML = "";
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(v => {
        const group = document.createElement("div");
        group.className = "preview-tag-group";
        
        const label = document.createElement("strong");
        label.innerText = v.name + ": ";
        group.appendChild(label);

        const list = document.createElement("div");
        list.className = "tag-options";
        v.options.forEach(opt => {
          const badge = document.createElement("span");
          badge.className = "tag-option";
          badge.innerText = opt;
          list.appendChild(badge);
        });

        group.appendChild(list);
        previewVariantsContainer.appendChild(group);
      });
    } else {
      previewVariantsContainer.innerHTML = `<span class="text-slate-400">Không có thông tin phân loại</span>`;
    }

    previewDesc.innerText = product.description || "Không có mô tả sản phẩm.";
    
    previewModal.classList.remove("hidden");
  }

  async function submitProduct(product) {
    // 1. Check settings first
    const settings = await chrome.storage.local.get(["hubUrl", "token"]);
    if (!settings.hubUrl || !settings.token) {
      showFeedback(
        "warning",
        "Vui lòng cấu hình kết nối trước.",
        "Bạn chưa cấu hình Địa chỉ Voltara Product Hub hoặc Mã kết nối. Vui lòng mở cài đặt để thiết lập."
      );
      btnFeedbackRetry.classList.add("hidden");
      return;
    }

    if (!product.name) {
      showFeedback(
        "error",
        "Lỗi sản phẩm",
        "Tên sản phẩm trống. Vui lòng tải lại dữ liệu trước khi gửi."
      );
      btnFeedbackRetry.classList.add("hidden");
      return;
    }

    // 2. Show loading status
    showFeedback(
      "loading",
      "Đang gửi dữ liệu...",
      "Sản phẩm đang được mã hóa và truyền tải về Voltara Product Hub."
    );
    btnFeedbackRetry.classList.add("hidden");

    // 3. Send message to background worker to request API upload
    chrome.runtime.sendMessage({
      type: "IMPORT_PRODUCT",
      productData: product
    }, (result) => {
      if (chrome.runtime.lastError) {
        showFeedback(
          "error",
          "Lỗi gửi tin",
          "Không thể gửi thông điệp tới tiến trình chạy ngầm. Vui lòng thử lại."
        );
        btnFeedbackRetry.classList.remove("hidden");
        return;
      }

      if (result && result.success) {
        showFeedback(
          "success",
          "Gửi thành công!",
          "Đã gửi sản phẩm về Voltara Product Hub thành công. Bạn có thể mở Hub để kiểm tra duyệt sản phẩm."
        );
        btnFeedbackRetry.classList.add("hidden");
      } else {
        showFeedback(
          "error",
          "Gửi dữ liệu thất bại",
          result ? result.error : "Không thể kết nối đến Voltara Hub."
        );
        btnFeedbackRetry.classList.remove("hidden");
      }
    });
  }

  function showFeedback(type, title, message) {
    panelValidPage.classList.add("hidden");
    panelFeedback.classList.remove("hidden");
    
    feedbackTitle.innerText = title;
    feedbackDesc.innerText = message;
    
    // Render icon
    feedbackIconContainer.className = "feedback-icon " + type;
    if (type === "success") {
      feedbackIconContainer.innerHTML = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "error" || type === "warning") {
      feedbackIconContainer.innerHTML = `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === "loading") {
      feedbackIconContainer.innerHTML = `<svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M4 12a8 8 0 0 1 8-8"></path></svg>`;
    }
  }

  // Regex parser to extract product weight in grams (defaulting to 500g)
  function parseWeightFromDetails(specifications, description) {
    // Check specifications first
    if (specifications && Array.isArray(specifications)) {
      for (const spec of specifications) {
        const nameLower = (spec.name || "").toLowerCase();
        if (nameLower.includes("cân nặng") || nameLower.includes("trọng lượng") || nameLower.includes("khối lượng") || nameLower.includes("weight")) {
          const valLower = (spec.value || "").toLowerCase();
          // Try to extract numbers and units (kg vs g)
          const numMatch = valLower.match(/([0-9.,]+)\s*(kg|g|gam|kgm|gr)/);
          if (numMatch) {
            let val = parseFloat(numMatch[1].replace(",", "."));
            const unit = numMatch[2];
            if (unit.startsWith("k")) {
              return Math.round(val * 1000); // convert kg to g
            } else {
              return Math.round(val);
            }
          }
          
          // Just extract first number if no clear unit
          const simpleNum = valLower.match(/([0-9.,]+)/);
          if (simpleNum) {
            let val = parseFloat(simpleNum[1].replace(",", "."));
            // If it's less than 20, it's likely in kg, convert to g
            if (val < 20) {
              return Math.round(val * 1000);
            }
            return Math.round(val);
          }
        }
      }
    }

    // Check description
    if (description) {
      const descLower = description.toLowerCase();
      const weightPatterns = [
        /(?:cân nặng|trọng lượng|khối lượng|nặng|weight)\s*(?:khoảng|tầm|:|)\s*([0-9.,]+)\s*(kg|g|gam|gr)/,
        /([0-9.,]+)\s*(kg|g|gam|gr)\s*(?:cân nặng|trọng lượng|khối lượng|nặng|weight)/,
        /trọng lượng\s*([0-9.,]+)\s*(kg|g|gam|gr)/,
        /cân nặng\s*([0-9.,]+)\s*(kg|g|gam|gr)/
      ];
      
      for (const pattern of weightPatterns) {
        const match = descLower.match(pattern);
        if (match) {
          let val = parseFloat(match[1].replace(",", "."));
          const unit = match[2];
          if (unit.startsWith("k")) {
            return Math.round(val * 1000);
          } else {
            return Math.round(val);
          }
        }
      }
    }

    return 500; // Default to 500g
  }

  async function extractProductFromBackgroundTab(productOrUrl, onStatusUpdate) {
    const fallbackProduct = typeof productOrUrl === "string" ? { url: productOrUrl } : productOrUrl;
    const productUrl = fallbackProduct.url;
    let attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const data = await new Promise((resolve, reject) => {
          let tabId = null;
          let updateListener = null;
          let timeoutId = null;
          
          const cleanUp = () => {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            if (updateListener) {
              chrome.tabs.onUpdated.removeListener(updateListener);
              updateListener = null;
            }
            if (tabId) {
              const currentTabId = tabId;
              tabId = null;
              chrome.tabs.remove(currentTabId, () => {
                if (chrome.runtime.lastError) {
                  // Ignore errors removing tab
                }
              });
            }
          };

          // Timeout handler
          timeoutId = setTimeout(() => {
            cleanUp();
            reject(new Error("Timeout waiting for product details"));
          }, 45000); // Shopee lazy-loads details slowly in background tabs

          onStatusUpdate("Đang mở trang");

          chrome.tabs.create({ url: productUrl, active: false }, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              cleanUp();
              reject(new Error(chrome.runtime.lastError?.message || "Không thể tạo tab"));
              return;
            }
            tabId = tab.id;

            onStatusUpdate("Đang chờ tải");

            updateListener = (updatedTabId, changeInfo, tabInfo) => {
              if (updatedTabId === tabId && changeInfo.status === "complete") {
                // Wait for Shopee hydration/lazy-loaded description blocks
                setTimeout(async () => {
                  try {
                    if (!tabId) return; // Cleaned up already

                    onStatusUpdate("Đang đọc dữ liệu");

                    // Inject content.js
                    await chrome.scripting.executeScript({
                      target: { tabId: tabId },
                      files: ["content.js"]
                    });

                    if (!tabId) return; // Cleaned up already

                    // Send message to extract complete product data
                    chrome.tabs.sendMessage(tabId, {
                      type: "EXTRACT_COMPLETE_PRODUCT",
                      originalUrl: productUrl,
                      itemId: fallbackProduct.itemId,
                      shopId: fallbackProduct.shopId,
                      fallbackProduct: fallbackProduct
                    }, (res) => {
                      if (chrome.runtime.lastError) {
                        cleanUp();
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                      }

                      if (res && res.success) {
                        const scrapedData = res.data;
                        if (!scrapedData || /\/verify\/captcha|anti_bot_tracking_id|captcha/i.test(scrapedData.sourceUrl || "")) {
                          cleanUp();
                          reject(new Error("Shopee yêu cầu xác minh captcha, chưa thể lấy dữ liệu chi tiết."));
                          return;
                        }
                        cleanUp();
                        resolve(scrapedData);
                      } else {
                        cleanUp();
                        reject(new Error(res?.error || "Không thể lấy dữ liệu sản phẩm"));
                      }
                    });
                  } catch (err) {
                    cleanUp();
                    reject(err);
                  }
                }, 6500);
              }
            };

            chrome.tabs.onUpdated.addListener(updateListener);
          });
        });
        return data;
      } catch (err) {
        console.debug(`Attempt ${attempt} failed:`, err);
        if (attempt === attempts) {
          throw err; // Re-throw if last attempt failed
        }
        onStatusUpdate(`Thử lại lần ${attempt}...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
});
