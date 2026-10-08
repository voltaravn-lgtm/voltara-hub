import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { 
  ExtensionProductImportRequest, 
  ExtensionProductPending, 
  ExtensionConnectionConfig 
} from "./src/types/extensionImportTypes";

const app = express();
const PORT = Number(process.env.PORT) || 3100;
const META_APP_ID = process.env.META_APP_ID?.trim() || "";
const META_APP_SECRET = process.env.META_APP_SECRET?.trim() || "";
const META_REDIRECT_URI = process.env.META_REDIRECT_URI?.trim() || "";
const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v25.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const APP_URL = process.env.APP_URL?.trim() || `http://localhost:${PORT}`;
const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
const execFileAsync = promisify(execFile);

interface StoredFacebookPage {
  id: string;
  name: string;
  category?: string;
  picture?: string;
  status: "connected" | "disconnected";
  encryptedAccessToken?: string;
  tasks?: string[];
  connectedAt?: string;
}

interface FacebookOAuthStore {
  stateHash?: string;
  stateExpiresAt?: string;
  encryptedUserToken?: string;
  pages: StoredFacebookPage[];
}

interface VoltaraDb {
  config: ExtensionConnectionConfig;
  products: ExtensionProductPending[];
  facebookPosts?: any[];
  facebookOAuth?: FacebookOAuthStore;
  facebookManualPublishJobs?: FacebookManualPublishJob[];
}

interface FacebookManualPublishJob {
  id: string;
  caption: string;
  media: Array<{ type: "image" | "video"; url: string; thumbnail?: string }>;
  pageId: string;
  pageName?: string;
  autoStart?: boolean;
  nextJobId?: string;
  batchId?: string;
  batchIndex?: number;
  batchTotal?: number;
  sourcePostId?: string;
  scheduleMode?: boolean;
  scheduledAt?: string;
  createdAt: string;
  expiresAt: string;
}

// Enable CORS for Chrome Extension and all other pre-flight API operations
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Body parser with 2MB size limit to avoid abuse
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Path to JSON DB for persistence - handle Vercel read-only filesystem
const IS_VERCEL = !!process.env.VERCEL;
const PACKAGED_DB_PATH = path.join(process.cwd(), "src", "data", "extension_db.json");
const DB_PATH = IS_VERCEL 
  ? path.join("/tmp", "extension_db.json") 
  : PACKAGED_DB_PATH;
const FACEBOOK_MEDIA_DIR = IS_VERCEL
  ? path.join("/tmp", "voltara_facebook_media")
  : path.join(path.dirname(DB_PATH), "facebook_media");

// Ensure directory and DB exist
const ensureDbExist = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    let initialData = {
      config: {
        isConnected: false,
        token: null,
        extensionName: "Voltara Product Importer",
        lastConnectedAt: null,
        productsSentCount: 0
      },
      products: [],
      facebookPosts: [],
      facebookOAuth: { pages: [] },
      facebookManualPublishJobs: []
    };

    // On Vercel, try to seed from packaged DB if it exists
    if (IS_VERCEL && fs.existsSync(PACKAGED_DB_PATH)) {
      try {
        const packagedData = fs.readFileSync(PACKAGED_DB_PATH, "utf-8");
        initialData = JSON.parse(packagedData);
      } catch (err) {
        console.error("Error reading packaged DB on Vercel:", err);
      }
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
  }
};

// Read DB helper
const readDb = (): VoltaraDb => {
  ensureDbExist();
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.facebookPosts) {
      parsed.facebookPosts = [];
    }
    if (!parsed.facebookOAuth) {
      parsed.facebookOAuth = { pages: [] };
    }
    if (!parsed.facebookManualPublishJobs) {
      parsed.facebookManualPublishJobs = [];
    }
    return parsed;
  } catch (err) {
    console.error("Error reading JSON database:", err);
    return {
      config: {
        isConnected: false,
        token: null,
        extensionName: "Voltara Product Importer",
        lastConnectedAt: null,
        productsSentCount: 0
      },
      products: [],
      facebookPosts: [],
      facebookOAuth: { pages: [] },
      facebookManualPublishJobs: []
    };
  }
};

// Write DB helper
const writeDb = (data: VoltaraDb) => {
  ensureDbExist();
  try {
    if (!data.facebookPosts) {
      data.facebookPosts = [];
    }
    if (!data.facebookOAuth) {
      data.facebookOAuth = { pages: [] };
    }
    if (!data.facebookManualPublishJobs) {
      data.facebookManualPublishJobs = [];
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to JSON database:", err);
  }
};

const facebookConfigReady = () => Boolean(
  META_APP_ID && META_APP_SECRET && META_REDIRECT_URI && META_GRAPH_VERSION
);

const getTokenEncryptionKey = () => crypto
  .createHash("sha256")
  .update(process.env.META_TOKEN_ENCRYPTION_KEY || META_APP_SECRET)
  .digest();

const encryptFacebookToken = (token: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(value => value.toString("base64url")).join(".");
};

const decryptFacebookToken = (payload: string): string => {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Dữ liệu Page Token không hợp lệ. Vui lòng kết nối Facebook lại.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getTokenEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
};

const readMetaJson = async (response: Response): Promise<any> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const metaMessage = data?.error?.message || `Facebook API trả về HTTP ${response.status}`;
    const metaCode = data?.error?.code ? ` (mã ${data.error.code})` : "";
    throw new Error(`${metaMessage}${metaCode}`);
  }
  return data;
};

const postMetaForm = async (pathName: string, params: Record<string, string>): Promise<any> => {
  const response = await fetch(`${META_GRAPH_BASE}/${pathName.replace(/^\//, "")}`, {
    method: "POST",
    body: new URLSearchParams(params)
  });
  return readMetaJson(response);
};

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const normalizeImportedPrice = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  let numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    const match = String(value).match(/([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})/);
    if (!match) return Number.NaN;
    numeric = Number(match[1].replace(/[^\d]/g, ""));
  }

  numeric = Math.round(numeric);

  // Old extension builds could concatenate a discount percent after the price:
  // 449000 + 25% became 44900025. Drop a trailing 1-2 digit percent when the
  // remaining value is a normal Shopee price.
  if (numeric >= 1000000) {
    const text = String(Math.trunc(numeric));
    const maybeDiscount = Number(text.slice(-2));
    const maybePrice = Number(text.slice(0, -2));
    if (maybeDiscount > 0 && maybeDiscount <= 99 && maybePrice >= 10000 && maybePrice <= 50000000 && maybePrice % 1000 === 0) {
      return maybePrice;
    }
  }

  if (numeric > 10000000 && numeric % 1000 !== 0) {
    return undefined;
  }

  return numeric;
};

const sanitizeImportedDescription = (value: unknown): string => {
  const description = value ? String(value).trim().substring(0, 15000) : "";
  if (!description) return "";

  const lower = description.toLowerCase();
  const footerSignals = [
    "kênh người bán",
    "kenh nguoi ban",
    "tải ứng dụng",
    "tai ung dung",
    "kết nối",
    "ket noi",
    "thông báo",
    "thong bao",
    "hỗ trợ",
    "ho tro",
    "chăm sóc khách hàng",
    "cham soc khach hang",
    "trung tâm trợ giúp",
    "trung tam tro giup",
    "bản quyền thuộc về",
    "ban quyen thuoc ve",
    "công ty tnhh shopee",
  ];

  const signalCount = footerSignals.filter(signal => lower.includes(signal)).length;
  return signalCount >= 2 ? "" : description;
};

// ==========================================
// 1. EXTENSION AUTH ENDPOINTS FOR REACT UI
// ==========================================

// Get connection settings status
app.get("/api/extensions/auth/status", (req, res) => {
  const db = readDb();
  res.json(db.config);
});

// Generate or regenerate token
app.post("/api/extensions/auth/generate", (req, res) => {
  const db = readDb();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const token = `VOLTARA-${rand4()}-${rand4()}`;
  
  db.config.isConnected = true;
  db.config.token = token;
  db.config.lastConnectedAt = new Date().toISOString();
  
  writeDb(db);
  res.json({ success: true, config: db.config });
});

// Disconnect extension
app.post("/api/extensions/auth/disconnect", (req, res) => {
  const db = readDb();
  db.config.isConnected = false;
  db.config.token = null;
  // Giữ lại số sản phẩm đã gửi và lần kết nối cuối để xem thống kê
  writeDb(db);
  res.json({ success: true, config: db.config });
});


// ==========================================
// 2. EXTENSION PRODUCT OPERATION ENDPOINTS FOR REACT UI
// ==========================================

// Get all pending products
app.get("/api/extensions/products", (req, res) => {
  const db = readDb();
  res.json(db.products);
});

// Get a single pending product
app.get("/api/extensions/products/:id", (req, res) => {
  const db = readDb();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Sản phẩm không tồn tại hoặc đã bị xóa." });
  }
  res.json(product);
});

// Update status of a pending product ('pending_review', 'imported', 'rejected')
app.put("/api/extensions/products/:id/status", (req, res) => {
  const db = readDb();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Sản phẩm không tồn tại." });
  }
  
  const { status } = req.body;
  if (!['pending_review', 'imported', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ." });
  }
  
  db.products[index].status = status;
  writeDb(db);
  res.json({ success: true, product: db.products[index] });
});

// Delete a pending product
app.delete("/api/extensions/products/:id", (req, res) => {
  const db = readDb();
  const filtered = db.products.filter(p => p.id !== req.params.id);
  if (filtered.length === db.products.length) {
    return res.status(404).json({ error: "Sản phẩm không tồn tại hoặc đã bị xóa trước đó." });
  }
  db.products = filtered;
  writeDb(db);
  res.json({ success: true, message: "Đã xóa sản phẩm khỏi danh sách chờ duyệt." });
});


// ==========================================
// 3. API ENDPOINTS CALLED BY CHROME EXTENSION
// ==========================================

app.get("/api/extensions/connection/test", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Thiếu mã kết nối"
    });
  }
  
  const token = authHeader.split(" ")[1];
  const db = readDb();
  
  if (!db.config.isConnected || !db.config.token) {
    return res.status(403).json({
      success: false,
      message: "Mã kết nối không hợp lệ"
    });
  }
  
  if (db.config.token !== token) {
    return res.status(403).json({
      success: false,
      message: "Mã kết nối không hợp lệ"
    });
  }
  
  res.json({
    success: true,
    connected: true,
    app: "Voltara Product Hub",
    message: "Kết nối thành công"
  });
});

app.post("/api/extensions/products/import", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Thiếu Authorization header hoặc định dạng không đúng." });
  }
  
  const token = authHeader.split(" ")[1];
  const db = readDb();
  
  if (!db.config.isConnected || !db.config.token || db.config.token !== token) {
    return res.status(401).json({ success: false, error: "Mã kết nối (Connection token) không hợp lệ hoặc đã bị vô hiệu hóa." });
  }
  
  // Validation for product data sent from extension
  const body = req.body as ExtensionProductImportRequest;
  
  // 1. Tên sản phẩm không được trống
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return res.status(400).json({ success: false, error: "Tên sản phẩm không được để trống." });
  }
  
  // 2. URL phải hợp lệ
  if (!body.sourceUrl || typeof body.sourceUrl !== "string" || !body.sourceUrl.startsWith("http")) {
    return res.status(400).json({ success: false, error: "Đường dẫn URL sản phẩm nguồn không hợp lệ." });
  }
  
  // 3. Giá không được âm
  const price = normalizeImportedPrice(body.price);
  const originalPrice = normalizeImportedPrice(body.originalPrice);
  if (price !== undefined && (isNaN(price) || price < 0)) {
    return res.status(400).json({ success: false, error: "Giá sản phẩm bán không hợp lệ (không được nhỏ hơn 0)." });
  }
  if (originalPrice !== undefined && (isNaN(originalPrice) || originalPrice < 0)) {
    return res.status(400).json({ success: false, error: "Giá gốc sản phẩm không hợp lệ." });
  }
  
  // 4. Giới hạn số lượng hình ảnh (lấy tối đa 10 hình)
  let images: string[] = [];
  if (Array.isArray(body.images)) {
    images = body.images
      .filter(img => typeof img === "string" && img.startsWith("http"))
      .slice(0, 30); // Giới hạn 30 hình ảnh
  }
  
  // Clean values, limit request sizes and strip invalid fields
  const importId = "imp_" + Math.random().toString(36).substring(2, 11);
  const newPendingProduct: ExtensionProductPending = {
    id: importId,
    source: "shopee",
    sourceUrl: body.sourceUrl.substring(0, 1000), // Limit URL size
    externalProductId: body.externalProductId ? String(body.externalProductId).substring(0, 100) : undefined,
    name: body.name.substring(0, 255), // Limit length
    sku: body.sku ? String(body.sku).substring(0, 100) : undefined,
    price: price,
    originalPrice: originalPrice,
    description: sanitizeImportedDescription(body.description), // Safe limit and strip Shopee footer text
    images: images,
    category: body.category ? String(body.category).substring(0, 100) : undefined,
    variants: Array.isArray(body.variants) ? body.variants.slice(0, 5).map(v => ({
      name: String(v.name).substring(0, 100),
      options: Array.isArray(v.options) ? v.options.slice(0, 20).map(o => String(o).substring(0, 100)) : []
    })) : [],
    seller: body.seller ? {
      name: body.seller.name ? String(body.seller.name).substring(0, 100) : undefined,
      shopUrl: body.seller.shopUrl ? String(body.seller.shopUrl).substring(0, 500) : undefined
    } : undefined,
    importedAt: body.importedAt ? String(body.importedAt) : new Date().toISOString(),
    weight: body.weight !== undefined ? Number(body.weight) : 500,
    status: "pending_review"
  };
  
  // Save into pending products list
  db.products.push(newPendingProduct);
  
  // Update connection stats
  db.config.productsSentCount += 1;
  db.config.lastConnectedAt = new Date().toISOString();
  
  writeDb(db);
  
  res.json({
    success: true,
    importId: importId,
    message: "Đã gửi sản phẩm về Voltara Product Hub"
  });
});

// ==========================================
// API ENDPOINTS FOR FACEBOOK IMPORTS
// ==========================================

app.get("/api/extensions/facebook", (req, res) => {
  const db = readDb();
  res.json(db.facebookPosts || []);
});

app.post(
  "/api/facebook/media/upload",
  express.raw({ type: () => true, limit: "100mb" }),
  async (req, res) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const mimeType = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
    const allowedTypes: Record<string, { extension: string; type: "image" | "video" }> = {
      "image/jpeg": { extension: "jpg", type: "image" },
      "image/png": { extension: "png", type: "image" },
      "image/webp": { extension: "webp", type: "image" },
      "image/gif": { extension: "gif", type: "image" },
      "video/mp4": { extension: "mp4", type: "video" },
      "video/webm": { extension: "webm", type: "video" },
      "video/quicktime": { extension: "mov", type: "video" }
    };
    const mediaType = allowedTypes[mimeType];
    if (!mediaType) {
      return res.status(415).json({ success: false, error: "Chỉ hỗ trợ JPG, PNG, WEBP, GIF, MP4, WEBM hoặc MOV." });
    }
    if (!body.length) {
      return res.status(400).json({ success: false, error: "Tệp tải lên đang trống." });
    }
    try {
      await fs.promises.mkdir(FACEBOOK_MEDIA_DIR, { recursive: true });
      const filename = `schedule-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${mediaType.extension}`;
      await fs.promises.writeFile(path.join(FACEBOOK_MEDIA_DIR, filename), body);
      return res.json({ success: true, media: { type: mediaType.type, url: `/api/facebook/media/${filename}` } });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || "Không lưu được media." });
    }
  }
);

app.get("/api/facebook/media/:filename", (req, res) => {
  const filename = String(req.params.filename || "");
  if (!/^[a-zA-Z0-9_-]+\.(?:mp4|webm|mov|jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return res.status(400).json({ success: false, error: "Tên tệp video không hợp lệ." });
  }
  const mediaPath = path.join(FACEBOOK_MEDIA_DIR, filename);
  if (!fs.existsSync(mediaPath)) {
    return res.status(404).json({ success: false, error: "Video đã ghép không còn tồn tại." });
  }
  // Local media can be normalized/repaired in place. Do not let the browser
  // keep an earlier incompatible VP9/AV1 response under the same URL.
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.type(path.extname(filename));
  return res.sendFile(mediaPath);
});

app.post("/api/extensions/facebook/import", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Thiếu Authorization header hoặc định dạng không đúng." });
  }
  
  const token = authHeader.split(" ")[1];
  const db = readDb();
  
  if (!db.config.isConnected || !db.config.token || db.config.token !== token) {
    return res.status(401).json({ success: false, error: "Mã kết nối (Connection token) không hợp lệ." });
  }
  
  const body = req.body;
  
  const caption = typeof body.originalCaption === "string"
    ? body.originalCaption
        .replace(/\s*(?:Ẩn bớt|Ẩn bài|See less|Hide post)\s*$/gimu, "")
        .trim()
    : "";
  const media = Array.isArray(body.media)
    ? body.media.filter((m: any) => m && typeof m.url === "string" && m.url.trim())
    : [];
  if (!caption && media.length === 0) {
    return res.status(400).json({ success: false, error: "Bài viết Facebook phải có nội dung, hình ảnh hoặc video." });
  }
  
  const fbImportId = "fb_imp_" + Math.random().toString(36).substring(2, 11);
  const normalizedMedia: any[] = [];
  try {
    await fs.promises.mkdir(FACEBOOK_MEDIA_DIR, { recursive: true });
    for (const [index, item] of media.entries()) {
      const type = item.type || "image";
      if (type === "video" && typeof item.audioUrl === "string" && item.audioUrl.trim()) {
        const merged = await muxFacebookDashVideo(item.url.trim(), item.audioUrl.trim());
        const filename = `${fbImportId}-${index + 1}.mp4`;
        await fs.promises.writeFile(path.join(FACEBOOK_MEDIA_DIR, filename), merged.bytes);
        normalizedMedia.push({
          type: "video",
          // Keep locally stored media host-agnostic. The browser will resolve
          // this against localhost in development and the deployed host in
          // production, so APP_URL cannot accidentally point local posts at
          // Vercel (which makes otherwise valid videos appear as 0:00).
          url: `/api/facebook/media/${filename}`,
          ...(item.thumbnailUrl ? { thumbnail: item.thumbnailUrl } : {})
        });
      } else {
        normalizedMedia.push({
          type,
          url: item.url,
          ...(item.thumbnailUrl ? { thumbnail: item.thumbnailUrl } : {})
        });
      }
    }
  } catch (error: any) {
    console.error("Facebook import media merge error:", error?.message || error);
    return res.status(422).json({
      success: false,
      error: error?.message || "Không thể ghép hình và tiếng của video Facebook."
    });
  }

  const newImportedPost = {
    id: fbImportId,
    fbPostId: body.fbPostId || "fb-post-" + Math.random().toString(36).substring(2, 8),
    pageName: body.pageName || "Trang cá nhân/Nhóm Facebook",
    postUrl: body.postUrl || "https://www.facebook.com",
    originalCaption: caption,
    editedCaption: typeof body.editedCaption === "string" ? body.editedCaption : caption,
    media: normalizedMedia,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (!db.facebookPosts) {
    db.facebookPosts = [];
  }
  db.facebookPosts.push(newImportedPost);
  writeDb(db);
  
  res.json({
    success: true,
    importId: fbImportId,
    message: "Đã gửi bài viết Facebook về Voltara Product Hub"
  });
});

app.delete("/api/extensions/facebook/:id", (req, res) => {
  const db = readDb();
  if (!db.facebookPosts) {
    db.facebookPosts = [];
  }
  const filtered = db.facebookPosts.filter(p => p.id !== req.params.id);
  db.facebookPosts = filtered;
  writeDb(db);
  res.json({ success: true, message: "Đã xóa bài viết đã import." });
});

// Prepare a short-lived handoff that the extension can read after the Hub
// opens the selected Page. The extension stops before the final Publish click.
app.post("/api/facebook/manual-publish", (req, res) => {
  const post = req.body?.post || {};
  const pageId = typeof req.body?.pageId === "string" ? req.body.pageId.trim() : "";
  const pageName = typeof req.body?.pageName === "string" ? req.body.pageName.trim() : "";
  const scheduleMode = req.body?.scheduleMode === true;
  const scheduledAt = typeof req.body?.scheduledAt === "string" ? req.body.scheduledAt.trim() : "";
  const caption = String(post.editedCaption || post.originalCaption || "")
    .replace(/\s*(?:Ẩn bớt|Ẩn bài|See less|Hide post)\s*$/gimu, "")
    .trim();
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const media = Array.isArray(post.media)
    ? post.media
        .filter((item: any) => item && (item.type === "image" || item.type === "video") && typeof item.url === "string" && (/^https?:\/\//i.test(item.url) || /^\/api\/facebook\/media\//i.test(item.url)))
        .slice(0, 20)
        .map((item: any) => ({
          type: item.type as "image" | "video",
          // The extension runs on facebook.com, so expand relative Hub media
          // URLs before handing the job to the content script.
          url: /^\//.test(item.url.trim()) ? `${requestOrigin}${item.url.trim()}` : item.url.trim(),
          ...(typeof item.thumbnail === "string" && item.thumbnail ? { thumbnail: item.thumbnail } : {})
        }))
    : [];

  if (!pageId) {
    return res.status(400).json({ success: false, error: "Vui lòng chọn một Fanpage đích." });
  }
  if (!caption && media.length === 0) {
    return res.status(400).json({ success: false, error: "Bài đăng phải có nội dung hoặc media." });
  }

  const db = readDb();
  const now = Date.now();
  const job: FacebookManualPublishJob = {
    id: crypto.randomBytes(18).toString("base64url"),
    caption: caption.slice(0, 63206),
    media,
    pageId,
    pageName: pageName || undefined,
    scheduleMode,
    scheduledAt: scheduleMode && !Number.isNaN(Date.parse(scheduledAt)) ? new Date(scheduledAt).toISOString() : undefined,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 60 * 1000).toISOString()
  };
  db.facebookManualPublishJobs = (db.facebookManualPublishJobs || [])
    .filter(item => Date.parse(item.expiresAt) > now)
    .slice(-19);
  db.facebookManualPublishJobs.push(job);
  writeDb(db);

  const facebookUrl = `https://www.facebook.com/${encodeURIComponent(pageId)}?voltara_manual_job=${encodeURIComponent(job.id)}`;
  return res.json({ success: true, jobId: job.id, facebookUrl, expiresAt: job.expiresAt });
});

// Prepare one browser-driven queue. The extension posts each item, then
// navigates the same Facebook tab to the next job to avoid popup storms and
// simultaneous video uploads.
app.post("/api/facebook/manual-publish-batch", (req, res) => {
  const posts = Array.isArray(req.body?.posts) ? req.body.posts.slice(0, 20) : [];
  const pageId = typeof req.body?.pageId === "string" ? req.body.pageId.trim() : "";
  const pageName = typeof req.body?.pageName === "string" ? req.body.pageName.trim() : "";
  if (!pageId) return res.status(400).json({ success: false, error: "Vui lòng chọn một Fanpage đích." });
  if (!posts.length) return res.status(400).json({ success: false, error: "Vui lòng chọn ít nhất một bài viết." });

  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const now = Date.now();
  const batchId = crypto.randomBytes(12).toString("base64url");
  const expiresAt = new Date(now + 2 * 60 * 60 * 1000).toISOString();
  const jobs: FacebookManualPublishJob[] = posts.map((post: any, index: number) => {
    const caption = String(post?.editedCaption || post?.originalCaption || "")
      .replace(/\s*(?:Ẩn bớt|Ẩn bài|See less|Hide post)\s*$/gimu, "")
      .trim()
      .slice(0, 63206);
    const media = Array.isArray(post?.media)
      ? post.media
          .filter((item: any) => item && (item.type === "image" || item.type === "video") && typeof item.url === "string" && (/^https?:\/\//i.test(item.url) || /^\/api\/facebook\/media\//i.test(item.url)))
          .slice(0, 20)
          .map((item: any) => ({
            type: item.type as "image" | "video",
            url: /^\//.test(item.url.trim()) ? `${requestOrigin}${item.url.trim()}` : item.url.trim(),
            ...(typeof item.thumbnail === "string" && item.thumbnail ? { thumbnail: item.thumbnail } : {})
          }))
      : [];
    return {
      id: crypto.randomBytes(18).toString("base64url"),
      caption,
      media,
      pageId,
      pageName: pageName || undefined,
      autoStart: true,
      batchId,
      batchIndex: index + 1,
      batchTotal: posts.length,
      sourcePostId: typeof post?.id === "string" ? post.id : undefined,
      createdAt: new Date(now).toISOString(),
      expiresAt
    };
  });
  for (let index = 0; index < jobs.length - 1; index += 1) jobs[index].nextJobId = jobs[index + 1].id;

  const db = readDb();
  db.facebookManualPublishJobs = (db.facebookManualPublishJobs || [])
    .filter(item => Date.parse(item.expiresAt) > now)
    .slice(-Math.max(0, 100 - jobs.length));
  db.facebookManualPublishJobs.push(...jobs);
  writeDb(db);

  const facebookUrl = `https://www.facebook.com/${encodeURIComponent(pageId)}?voltara_manual_job=${encodeURIComponent(jobs[0].id)}`;
  return res.json({ success: true, batchId, count: jobs.length, facebookUrl, expiresAt });
});

app.get("/api/extensions/facebook/manual-publish/:id", (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const db = readDb();
  if (!db.config.isConnected || !db.config.token || token !== db.config.token) {
    return res.status(401).json({ success: false, error: "Mã kết nối tiện ích không hợp lệ." });
  }

  const now = Date.now();
  db.facebookManualPublishJobs = (db.facebookManualPublishJobs || [])
    .filter(item => Date.parse(item.expiresAt) > now);
  const job = db.facebookManualPublishJobs.find(item => item.id === req.params.id);
  writeDb(db);
  if (!job) {
    return res.status(404).json({ success: false, error: "Gói đăng thủ công đã hết hạn hoặc không tồn tại." });
  }
  return res.json({ success: true, job });
});

// ==========================================
// FACEBOOK OAUTH, PAGE TOKENS AND PUBLISHING
// ==========================================

app.get("/api/facebook/config", (_req, res) => {
  res.json({
    configured: facebookConfigReady(),
    redirectUri: META_REDIRECT_URI,
    graphVersion: META_GRAPH_VERSION
  });
});

app.get("/api/facebook/pages", (_req, res) => {
  const db = readDb();
  const pages = (db.facebookOAuth?.pages || []).map(page => ({
    id: page.id,
    name: page.name,
    category: page.category,
    picture: page.picture,
    status: page.status,
    tasks: page.tasks || []
  }));
  res.json({ success: true, pages });
});

app.get("/api/facebook/oauth/start", (_req, res) => {
  if (!facebookConfigReady()) {
    return res.status(500).json({
      success: false,
      error: "Thiếu cấu hình META_APP_ID, META_APP_SECRET, META_REDIRECT_URI hoặc META_GRAPH_VERSION trong .env."
    });
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const db = readDb();
  db.facebookOAuth = db.facebookOAuth || { pages: [] };
  db.facebookOAuth.stateHash = crypto.createHash("sha256").update(state).digest("hex");
  db.facebookOAuth.stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  writeDb(db);

  const authParams = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: META_REDIRECT_URI,
    state,
    response_type: "code",
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts"
  });

  res.json({
    success: true,
    authUrl: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${authParams.toString()}`
  });
});

app.get("/api/facebook/oauth/callback", async (req, res) => {
  const sendResultPage = (success: boolean, message: string) => {
    const origin = (() => {
      try {
        return new URL(APP_URL).origin;
      } catch {
        return `http://localhost:${PORT}`;
      }
    })();
    const color = success ? "#059669" : "#dc2626";
    const title = success ? "Kết nối Facebook thành công" : "Kết nối Facebook thất bại";
    res.status(success ? 200 : 400).type("html").send(`<!doctype html>
      <html lang="vi"><head><meta charset="utf-8"><title>${title}</title></head>
      <body style="font-family:Arial,sans-serif;padding:32px;text-align:center">
        <h2 style="color:${color}">${title}</h2>
        <p>${escapeHtml(message)}</p>
        <p>Bạn có thể đóng cửa sổ này.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify({ type: "voltara-facebook-oauth", success, message })}, ${JSON.stringify(origin)});
            setTimeout(function () { window.close(); }, 600);
          }
        </script>
      </body></html>`);
  };

  try {
    if (!facebookConfigReady()) {
      throw new Error("Cấu hình Facebook trong .env chưa đầy đủ.");
    }
    if (typeof req.query.error === "string") {
      throw new Error(typeof req.query.error_description === "string" ? req.query.error_description : req.query.error);
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const db = readDb();
    const savedHash = db.facebookOAuth?.stateHash || "";
    const expiresAt = Date.parse(db.facebookOAuth?.stateExpiresAt || "");
    const receivedHash = crypto.createHash("sha256").update(state).digest("hex");

    if (!code || !state || !savedHash || receivedHash !== savedHash || !expiresAt || expiresAt < Date.now()) {
      throw new Error("Phiên đăng nhập Facebook không hợp lệ hoặc đã hết hạn. Vui lòng kết nối lại.");
    }

    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: META_REDIRECT_URI,
      code
    });
    const shortTokenData = await readMetaJson(await fetch(`${META_GRAPH_BASE}/oauth/access_token?${tokenParams.toString()}`));

    const longTokenParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortTokenData.access_token
    });
    const longTokenData = await readMetaJson(await fetch(`${META_GRAPH_BASE}/oauth/access_token?${longTokenParams.toString()}`));
    const userToken = longTokenData.access_token || shortTokenData.access_token;

    const pageParams = new URLSearchParams({
      fields: "id,name,category,picture{url},access_token,tasks",
      limit: "100",
      access_token: userToken
    });
    const accountsData = await readMetaJson(await fetch(`${META_GRAPH_BASE}/me/accounts?${pageParams.toString()}`));
    const connectedAt = new Date().toISOString();
    const pages: StoredFacebookPage[] = (accountsData.data || [])
      .filter((page: any) => page?.id && page?.name && page?.access_token)
      .map((page: any) => ({
        id: String(page.id),
        name: String(page.name),
        category: page.category ? String(page.category) : undefined,
        picture: page.picture?.data?.url ? String(page.picture.data.url) : undefined,
        status: "connected" as const,
        encryptedAccessToken: encryptFacebookToken(String(page.access_token)),
        tasks: Array.isArray(page.tasks) ? page.tasks.map(String) : [],
        connectedAt
      }));

    db.facebookOAuth = {
      pages,
      encryptedUserToken: encryptFacebookToken(userToken)
    };
    writeDb(db);

    if (pages.length === 0) {
      sendResultPage(false, "Facebook đăng nhập thành công nhưng không trả về Fanpage nào có quyền quản lý.");
      return;
    }
    sendResultPage(true, `Đã kết nối ${pages.length} Fanpage.`);
  } catch (error: any) {
    console.error("Facebook OAuth callback error:", error?.message || error);
    sendResultPage(false, error?.message || "Không thể kết nối Facebook.");
  }
});

app.delete("/api/facebook/pages/:id", (req, res) => {
  const db = readDb();
  const pages = db.facebookOAuth?.pages || [];
  const page = pages.find(item => item.id === req.params.id);
  if (!page) {
    return res.status(404).json({ success: false, error: "Không tìm thấy Fanpage đã kết nối." });
  }
  page.status = "disconnected";
  page.encryptedAccessToken = undefined;
  writeDb(db);
  res.json({ success: true });
});

const downloadFacebookMedia = async (urlValue: string, kind: "image" | "video") => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlValue);
  } catch {
    throw new Error("Đường dẫn media không hợp lệ.");
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error("Facebook chỉ hỗ trợ media qua HTTP/HTTPS.");
  }

  const response = await fetch(parsedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 VoltaraProductHub/1.0",
      "Referer": "https://www.facebook.com/"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Không tải được ${kind === "video" ? "video" : "hình ảnh"} nguồn (HTTP ${response.status}). Link có thể đã hết hạn.`);
  }

  const maximumSize = kind === "video" ? 250 * 1024 * 1024 : 25 * 1024 * 1024;
  const announcedSize = Number(response.headers.get("content-length") || 0);
  if (announcedSize > maximumSize) {
    throw new Error(`${kind === "video" ? "Video" : "Hình ảnh"} vượt quá giới hạn tải tạm của Hub.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maximumSize) {
    throw new Error(`${kind === "video" ? "Video" : "Hình ảnh"} vượt quá giới hạn tải tạm của Hub.`);
  }
  const contentType = response.headers.get("content-type") || (kind === "video" ? "video/mp4" : "image/jpeg");
  const binary = kind === "video" ? Buffer.from(bytes) : null;
  const hasVideoTrack = binary ? binary.includes(Buffer.from("vide")) : false;
  const hasAudioTrack = binary ? binary.includes(Buffer.from("soun")) : false;
  return {
    blob: new Blob([bytes], { type: contentType }),
    bytes: Buffer.from(bytes),
    contentType,
    hasVideoTrack,
    hasAudioTrack
  };
};

const muxFacebookDashVideo = async (videoUrl: string, audioUrl: string) => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "voltara-fb-"));
  const videoPath = path.join(tempDir, "video.mp4");
  const audioPath = path.join(tempDir, "audio.m4a");
  const outputPath = path.join(tempDir, "merged.mp4");
  try {
    const [videoSource, audioSource] = await Promise.all([
      downloadFacebookMedia(videoUrl, "video"),
      downloadFacebookMedia(audioUrl, "video")
    ]);
    if (!videoSource.hasVideoTrack) {
      throw new Error("Luồng hình của Reel không hợp lệ.");
    }
    if (!audioSource.hasAudioTrack) {
      throw new Error("Luồng tiếng của Reel không hợp lệ.");
    }
    await Promise.all([
      fs.promises.writeFile(videoPath, videoSource.bytes),
      fs.promises.writeFile(audioPath, audioSource.bytes)
    ]);
    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-map", "0:v:0",
      "-map", "1:a:0",
      // Facebook DASH may currently deliver VP9 or AV1 inside MP4. Some
      // Chromium/Coc Coc builds show those files as 0:00 even though ffprobe
      // sees valid tracks. Normalize to broadly supported H.264 + AAC.
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-movflags", "+faststart",
      outputPath
    ], { timeout: 5 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
    const mergedBytes = await fs.promises.readFile(outputPath);
    if (!mergedBytes.includes(Buffer.from("vide")) || !mergedBytes.includes(Buffer.from("soun"))) {
      throw new Error("FFmpeg không tạo được video có đủ hình và tiếng.");
    }
    return {
      blob: new Blob([mergedBytes], { type: "video/mp4" }),
      bytes: mergedBytes
    };
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new Error("Máy chủ chưa cài FFmpeg. Hãy cài FFmpeg hoặc cấu hình FFMPEG_PATH.");
    }
    throw error;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

const publishToFacebookPage = async (
  page: StoredFacebookPage,
  caption: string,
  media: Array<{ type: "image" | "video"; url: string; audioUrl?: string }>
) => {
  if (!page.encryptedAccessToken) {
    throw new Error(`Fanpage ${page.name} chưa có Page Token. Vui lòng kết nối lại.`);
  }
  const accessToken = decryptFacebookToken(page.encryptedAccessToken);
  const video = media.find(item => item.type === "video");

  if (video) {
    let blob: Blob;
    if (video.audioUrl) {
      blob = (await muxFacebookDashVideo(video.url, video.audioUrl)).blob;
    } else {
      const downloaded = await downloadFacebookMedia(video.url, "video");
      if (!downloaded.hasVideoTrack) {
        throw new Error("Tệp nguồn không chứa track video hợp lệ.");
      }
      if (!downloaded.hasAudioTrack) {
        throw new Error("Video nguồn không có track âm thanh. Hãy copy lại bằng tiện ích bản mới.");
      }
      blob = downloaded.blob;
    }
    const form = new FormData();
    form.append("source", blob, "voltara-video.mp4");
    form.append("description", caption);
    form.append("access_token", accessToken);
    const response = await fetch(`${META_GRAPH_BASE}/${page.id}/videos`, { method: "POST", body: form });
    const data = await readMetaJson(response);
    return { id: String(data.id), mediaType: "video" };
  }

  const images = media.filter(item => item.type === "image");
  if (images.length > 0) {
    const mediaIds: string[] = [];
    for (const [index, image] of images.slice(0, 10).entries()) {
      const { blob } = await downloadFacebookMedia(image.url, "image");
      const form = new FormData();
      form.append("source", blob, `voltara-image-${index + 1}.jpg`);
      form.append("published", "false");
      form.append("access_token", accessToken);
      const uploadData = await readMetaJson(await fetch(`${META_GRAPH_BASE}/${page.id}/photos`, {
        method: "POST",
        body: form
      }));
      mediaIds.push(String(uploadData.id));
    }

    const feedData = await postMetaForm(`${page.id}/feed`, {
      message: caption,
      attached_media: JSON.stringify(mediaIds.map(media_fbid => ({ media_fbid }))),
      access_token: accessToken
    });
    return { id: String(feedData.id), mediaType: "images" };
  }

  const feedData = await postMetaForm(`${page.id}/feed`, {
    message: caption,
    access_token: accessToken
  });
  return { id: String(feedData.id), mediaType: "text" };
};

app.post("/api/facebook/publish", async (req, res) => {
  if (!facebookConfigReady()) {
    return res.status(500).json({ success: false, error: "Facebook API chưa được cấu hình trong .env." });
  }

  const pageIds = Array.isArray(req.body?.pageIds) ? req.body.pageIds.map(String) : [];
  const caption = String(req.body?.post?.editedCaption || req.body?.post?.originalCaption || "").trim();
  const media = Array.isArray(req.body?.post?.media)
    ? req.body.post.media
      .filter((item: any) => item && ["image", "video"].includes(item.type) && typeof item.url === "string" && item.url.trim())
      .map((item: any) => ({
        type: item.type as "image" | "video",
        url: item.url.trim(),
        ...(typeof item.audioUrl === "string" && item.audioUrl.trim() ? { audioUrl: item.audioUrl.trim() } : {})
      }))
    : [];

  if (pageIds.length === 0) {
    return res.status(400).json({ success: false, error: "Chưa chọn Fanpage đích để đăng bài." });
  }
  if (!caption && media.length === 0) {
    return res.status(400).json({ success: false, error: "Bài đăng phải có nội dung, hình ảnh hoặc video." });
  }

  const db = readDb();
  const storedPages = db.facebookOAuth?.pages || [];
  const results: any[] = [];

  for (const pageId of pageIds) {
    const page = storedPages.find(item => item.id === pageId && item.status === "connected");
    if (!page) {
      results.push({ pageId, success: false, error: "Fanpage chưa kết nối hoặc Page Token không tồn tại." });
      continue;
    }
    try {
      const published = await publishToFacebookPage(page, caption, media);
      results.push({
        pageId: page.id,
        pageName: page.name,
        success: true,
        postId: published.id,
        permalink: `https://www.facebook.com/${published.id}`,
        mediaType: published.mediaType
      });
    } catch (error: any) {
      console.error(`Facebook publish error for page ${page.id}:`, error?.message || error);
      results.push({ pageId: page.id, pageName: page.name, success: false, error: error?.message || "Đăng bài thất bại." });
    }
  }

  const successCount = results.filter(item => item.success).length;
  const failureCount = results.length - successCount;
  res.status(successCount > 0 ? 200 : 400).json({
    success: successCount > 0,
    partial: successCount > 0 && failureCount > 0,
    results,
    error: successCount === 0 ? results.map(item => item.error).filter(Boolean).join("; ") : undefined
  });
});

// ==========================================
// 4. VITE DEVELOPER SERVER ENVIRONMENT
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Voltara Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!IS_VERCEL) {
  startServer();
}

export default app;
