import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { BlobServiceClient } from "@azure/storage-blob";
import multer from "multer";

let azureStorageClient: BlobServiceClient | null = null;

function getAzureStorage(): BlobServiceClient {
  if (!azureStorageClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
    }
    azureStorageClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return azureStorageClient;
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

  // Setup local uploads fallback directory in a writable directory
  // Try /tmp/uploads_fallback first for Cloud Run containers, then fallback to process.cwd()
  let fallbackDir = "/tmp/uploads_fallback";
  try {
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(fallbackDir, ".write-test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    console.log(`[SERVER] Fallback storage configured at writable path: ${fallbackDir}`);
  } catch (e) {
    fallbackDir = path.join(process.cwd(), "uploads_fallback");
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      console.log(`[SERVER] /tmp not writable. Fallback storage configured at project path: ${fallbackDir}`);
    } catch (err2: any) {
      console.error("[SERVER] CRITICAL: Both /tmp and process.cwd() fallback directories are not writable!", err2);
    }
  }

  // Serve the local dynamic uploads statically
  app.use("/uploads", express.static(fallbackDir));

  app.use(express.json());

  // API Route: Azure Blob Storage File Upload with automated Local Storage Fallback
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "bebaupload";
    const blobName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    
    console.log(`[AZURE-UPLOAD] Attempting Azure Storage Upload for '${file.originalname}' into container '${containerName}'...`);

    try {
      const storageClient = getAzureStorage();
      const containerClient = storageClient.getContainerClient(containerName);
      
      // Lazily check/create the container
      try {
        const exists = await containerClient.exists();
        if (!exists) {
          console.log(`[AZURE-UPLOAD] Container '${containerName}' not found. Attempting to create with public blob-level access...`);
          try {
            await containerClient.create({ access: "blob" });
          } catch (createErr: any) {
            console.warn(`[AZURE-UPLOAD] Failed to create container with public 'blob' access: ${createErr.message}. Retrying without access level...`);
            await containerClient.create();
          }
          console.log(`[AZURE-UPLOAD] Successfully created container '${containerName}'.`);
        }
      } catch (containerErr: any) {
        console.warn(`[AZURE-UPLOAD] Container existence/creation notice: ${containerErr.message}. Proactive upload proceeding...`);
      }

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      console.log(`[AZURE-UPLOAD] Uploading '${file.originalname}'...`);
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
          blobCacheControl: "public, max-age=31536000",
        }
      });

      const publicUrl = blockBlobClient.url;
      console.log(`[AZURE-UPLOAD] Upload complete! Public URL: ${publicUrl}`);
      
      res.json({
        status: "success",
        url: publicUrl,
        storageType: "azure",
      });
    } catch (err: any) {
      console.warn(`[AZURE-UPLOAD-FAILED] Azure upload failed: "${err.message}". Falling back gracefully to Local Disk Storage...`);
      
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
          errorDetails: err.message,
        });
      } catch (fallbackErr: any) {
        console.error("[LOCAL-FALLBACK-CRITICAL-FAILED]", fallbackErr);
        res.status(500).json({
          error: "Failed to upload to Azure Storage, and local disk fallback failed as well.",
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
