import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Storage } from "@google-cloud/storage";
import multer from "multer";

let gcsStorage: Storage | null = null;

function getGCSStorage(): Storage {
  if (!gcsStorage) {
    const projectId = process.env.GCP_PROJECT_ID || "build-with-ai-496714";
    gcsStorage = new Storage({ projectId });
  }
  return gcsStorage;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Setup local uploads fallback directory inside project root
  const fallbackDir = path.join(process.cwd(), "uploads_fallback");
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }

  // Serve the local dynamic uploads statically
  app.use("/uploads", express.static(fallbackDir));

  app.use(express.json());

  // API Route: Google Cloud Storage File Upload with automated Local Storage Fallback on IAM failures
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
      
      // Lazily check/create the bucket
      try {
        const [exists] = await bucket.exists();
        if (!exists) {
          console.log(`[GCS-UPLOAD] Bucket '${bucketName}' not found. Attempting to create...`);
          await storageClient.createBucket(bucketName, {
            location: "asia-east1", // Near primary Cloud Run region
            uniformBucketLevelAccess: true,
          });
          console.log(`[GCS-UPLOAD] Successfully created bucket '${bucketName}'.`);
        }
      } catch (bucketErr: any) {
        console.warn(`[GCS-UPLOAD] Bucket existence/creation notice: ${bucketErr.message}. Proactive upload proceeding...`);
      }

      const blob = bucket.file(blobName);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: file.mimetype,
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });

      await new Promise<void>((resolve, reject) => {
        blobStream.on("error", (err) => {
          console.error("[GCS-STREAM-ERROR]", err);
          reject(err);
        });

        blobStream.on("finish", () => {
          resolve();
        });

        blobStream.end(file.buffer);
      });

      // Try making the object public so anyone can view the memory card
      try {
        await blob.makePublic();
      } catch (pubErr: any) {
        console.warn(`[GCS-UPLOAD] Object makePublic notice: ${pubErr.message}`);
      }

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blobName}`;
      console.log(`[GCS-UPLOAD] Upload complete! Public URL: ${publicUrl}`);
      
      res.json({
        status: "success",
        url: publicUrl,
        storageType: "gcs",
      });
    } catch (err: any) {
      console.warn(`[GCS-UPLOAD-FAILED] GCS upload failed: "${err.message}". Falling back gracefully to Local Disk Storage...`);
      
      try {
        // Save to local filesystem fallback folder
        const localPath = path.join(fallbackDir, blobName);
        fs.writeFileSync(localPath, file.buffer);
        
        console.log(`[LOCAL-FALLBACK] Successfully written file on local disk: ${localPath}`);
        
        // This URL matches the statically-served pathway
        const fallbackUrl = `/uploads/${blobName}`;
        
        res.json({
          status: "success",
          url: fallbackUrl,
          storageType: "local",
          serviceAccount: "ais-sandbox@ais-asia-east1-dea02eec22a0406.iam.gserviceaccount.com",
          errorDetails: err.message,
        });
      } catch (fallbackErr: any) {
        console.error("[LOCAL-FALLBACK-CRITICAL-FAILED]", fallbackErr);
        res.status(500).json({
          error: "Failed to upload to Google Cloud Storage, and local disk fallback failed as well.",
          details: `${err.message} (Fallback error: ${fallbackErr.message})`,
        });
      }
    }
  });

  // API Route: Send notifications (Mock implementation for now)
  app.post("/api/notify", (req, res) => {
    const { to, from, action, memoryTitle } = req.body;
    console.log(`[NOTIFICATION] To: ${to}, From: ${from}, Action: ${action}, Memory: ${memoryTitle}`);
    // In a real app, you'd use a service like SendGrid or Nodemailer here.
    res.json({ status: "success", message: "Notification logged to server console" });
  });

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
