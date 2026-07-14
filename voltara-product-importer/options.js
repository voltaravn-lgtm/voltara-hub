// Settings and Options configuration for Voltara Product Importer Chrome Extension

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("settings-form");
  const hubUrlInput = document.getElementById("hub-url");
  const tokenInput = document.getElementById("token");
  
  const btnSave = document.getElementById("btn-save");
  const btnTest = document.getElementById("btn-test");
  const btnDisconnect = document.getElementById("btn-disconnect");
  
  const statusPanel = document.getElementById("status-panel");
  const statusTitle = document.getElementById("status-title");
  const statusDesc = document.getElementById("status-desc");

  // Load saved settings
  chrome.storage.local.get(["hubUrl", "token"], (data) => {
    if (data.hubUrl && data.token) {
      hubUrlInput.value = data.hubUrl;
      tokenInput.value = data.token;
      
      btnDisconnect.classList.remove("hidden");
      updateStatusUI("checking");
      
      // Silently verify if connection is still good
      testConnectionSilent(data.hubUrl, data.token);
    } else {
      updateStatusUI("disconnected");
      btnDisconnect.classList.add("hidden");
    }
  });

  // Save Settings
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    let hubUrl = hubUrlInput.value.trim();
    // Strip trailing slash
    hubUrl = hubUrl.replace(/\/$/, "");
    const token = tokenInput.value.trim();

    if (!hubUrl || !token) {
      alert("Vui lòng điền đầy đủ Địa chỉ Hub và Mã kết nối.");
      return;
    }

    // Save to storage
    chrome.storage.local.set({ hubUrl, token }, () => {
      btnDisconnect.classList.remove("hidden");
      // Trigger a connection test immediately
      testConnectionActive(hubUrl, token);
    });
  });

  // Test Connection Button click
  btnTest.addEventListener("click", () => {
    const hubUrl = hubUrlInput.value.trim().replace(/\/$/, "");
    const token = tokenInput.value.trim();

    if (!hubUrl || !token) {
      alert("Vui lòng nhập đầy đủ Địa chỉ Hub và Mã kết nối trước khi kiểm tra.");
      return;
    }

    testConnectionActive(hubUrl, token);
  });

  // Disconnect / Clear Button click
  btnDisconnect.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn ngắt kết nối và xóa cấu hình tiện ích?")) {
      chrome.storage.local.remove(["hubUrl", "token"], () => {
        hubUrlInput.value = "";
        tokenInput.value = "";
        updateStatusUI("disconnected");
        btnDisconnect.classList.add("hidden");
        alert("Đã xóa cấu hình kết nối tiện ích.");
      });
    }
  });

  // Active Connection Test with full user feedback
  function testConnectionActive(hubUrl, token) {
    btnTest.disabled = true;
    btnTest.innerText = "ĐANG KIỂM TRA...";
    
    chrome.runtime.sendMessage({
      type: "TEST_CONNECTION",
      hubUrl,
      token
    }, (result) => {
      btnTest.disabled = false;
      btnTest.innerText = "KIỂM TRA KẾT NỐI";

      if (chrome.runtime.lastError) {
        updateStatusUI("failed", "Không thể gửi tin nhắn kiểm tra. Hãy tải lại tiện ích.");
        return;
      }

      if (result && result.success) {
        updateStatusUI("connected", hubUrl);
        alert(result.message || "Kết nối đến Voltara Product Hub thành công!");
      } else {
        const errMsg = result ? result.error : "Lỗi không xác định.";
        updateStatusUI("failed", errMsg);
        alert("Kết nối thất bại: " + errMsg);
      }
    });
  }

  // Silent test on page load to confirm active viability
  function testConnectionSilent(hubUrl, token) {
    chrome.runtime.sendMessage({
      type: "TEST_CONNECTION",
      hubUrl,
      token
    }, (result) => {
      if (result && result.success) {
        updateStatusUI("connected", hubUrl);
      } else {
        const errMsg = result ? result.error : "Lỗi xác thực hoặc hết hạn kết nối.";
        updateStatusUI("failed", errMsg);
      }
    });
  }

  // Update central status panel helper
  function updateStatusUI(state, extraInfo = "") {
    statusPanel.className = "status-panel";
    
    if (state === "connected") {
      statusPanel.classList.add("status-connected");
      statusTitle.innerText = "Đã kết nối";
      statusDesc.innerHTML = `Tiện ích mở rộng đã liên kết hoạt động tốt với Voltara Product Hub tại địa chỉ:<br><strong>${extraInfo}</strong>`;
    } else if (state === "checking") {
      statusPanel.classList.add("status-checking");
      statusTitle.innerText = "Đang kiểm tra...";
      statusDesc.innerText = "Đang kiểm tra trạng thái kết nối đến Voltara Product Hub...";
    } else if (state === "failed") {
      statusPanel.classList.add("status-failed");
      statusTitle.innerText = "Kết nối thất bại";
      statusDesc.innerHTML = `Không thể thiết lập liên kết đến Voltara Hub. Lý do:<br><strong class="text-danger">${extraInfo || "Không phản hồi"}</strong>.<br>Vui lòng kiểm tra lại tính chính xác của URL Hub và Mã kết nối.`;
    } else {
      statusPanel.classList.add("status-disconnected");
      statusTitle.innerText = "Chưa kết nối";
      statusDesc.innerText = "Tiện ích chưa được liên kết với bất kỳ Voltara Product Hub nào. Vui lòng nhập thông tin cấu hình và bấm Lưu cấu hình.";
    }
  }
});
