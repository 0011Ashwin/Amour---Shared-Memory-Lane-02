var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_storage = require("@google-cloud/storage");
var import_multer = __toESM(require("multer"), 1);
var gcsStorage = null;
function getGCSStorage() {
  if (!gcsStorage) {
    const projectId = process.env.GCP_PROJECT_ID || "build-with-ai-496714";
    gcsStorage = new import_storage.Storage({ projectId });
  }
  return gcsStorage;
}
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  }
});
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
  const fallbackDir = import_path.default.join(process.cwd(), "uploads_fallback");
  if (!import_fs.default.existsSync(fallbackDir)) {
    import_fs.default.mkdirSync(fallbackDir, { recursive: true });
  }
  app.use("/uploads", import_express.default.static(fallbackDir));
  app.use(import_express.default.json());
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const projectId = process.env.GCP_PROJECT_ID || "build-with-ai-496714";
    const bucketName = process.env.GCS_BUCKET_NAME || "beba-001";
    const blobName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    console.log(`[GCS-UPLOAD] Attempting GCS Upload for '${file.originalname}' into bucket '${bucketName}' (Project: ${projectId})...`);
    try {
      const storageClient = getGCSStorage();
      const bucket = storageClient.bucket(bucketName);
      try {
        const [exists] = await bucket.exists();
        if (!exists) {
          console.log(`[GCS-UPLOAD] Bucket '${bucketName}' not found. Attempting to create...`);
          await storageClient.createBucket(bucketName, {
            location: "asia-east1",
            // Near primary Cloud Run region
            uniformBucketLevelAccess: true
          });
          console.log(`[GCS-UPLOAD] Successfully created bucket '${bucketName}'.`);
        }
      } catch (bucketErr) {
        console.warn(`[GCS-UPLOAD] Bucket existence/creation notice: ${bucketErr.message}. Proactive upload proceeding...`);
      }
      const blob = bucket.file(blobName);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
        metadata: {
          cacheControl: "public, max-age=31536000"
        }
      });
      await new Promise((resolve, reject) => {
        blobStream.on("error", (err) => {
          console.error("[GCS-STREAM-ERROR]", err);
          reject(err);
        });
        blobStream.on("finish", () => {
          resolve();
        });
        blobStream.end(file.buffer);
      });
      try {
        await blob.makePublic();
      } catch (pubErr) {
        console.warn(`[GCS-UPLOAD] Object makePublic notice: ${pubErr.message}`);
      }
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blobName}`;
      console.log(`[GCS-UPLOAD] Upload complete! Public URL: ${publicUrl}`);
      res.json({
        status: "success",
        url: publicUrl,
        storageType: "gcs"
      });
    } catch (err) {
      console.warn(`[GCS-UPLOAD-FAILED] GCS upload failed: "${err.message}". Falling back gracefully to Local Disk Storage...`);
      try {
        const localPath = import_path.default.join(fallbackDir, blobName);
        import_fs.default.writeFileSync(localPath, file.buffer);
        console.log(`[LOCAL-FALLBACK] Successfully written file on local disk: ${localPath}`);
        const fallbackUrl = `/uploads/${blobName}`;
        res.json({
          status: "success",
          url: fallbackUrl,
          storageType: "local",
          serviceAccount: "ais-sandbox@ais-asia-east1-dea02eec22a0406.iam.gserviceaccount.com",
          errorDetails: err.message
        });
      } catch (fallbackErr) {
        console.error("[LOCAL-FALLBACK-CRITICAL-FAILED]", fallbackErr);
        res.status(500).json({
          error: "Failed to upload to Google Cloud Storage, and local disk fallback failed as well.",
          details: `${err.message} (Fallback error: ${fallbackErr.message})`
        });
      }
    }
  });
  app.post("/api/notify", (req, res) => {
    const { to, from, action, memoryTitle } = req.body;
    console.log(`[NOTIFICATION] To: ${to}, From: ${from}, Action: ${action}, Memory: ${memoryTitle}`);
    res.json({ status: "success", message: "Notification logged to server console" });
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
