import { NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import fs from "fs";
import path from "path";

// Initialize Cloudinary
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file uploaded", "VALIDATION_ERROR", 400);
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. If Cloudinary is configured with valid credentials, upload to Cloudinary
    const hasCloudinary = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (hasCloudinary) {
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "shopnearfin/receipts",
            resource_type: "image",
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error("Cloudinary upload failed"));
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(buffer);
      });

      return successResponse({ url: uploadResult.secure_url }, "Image uploaded to Cloudinary successfully");
    }

    // 2. Fallback to local upload directory (public/uploads/) so user can test immediately even before adding Cloudinary keys
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const sanitizedFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadsDir, sanitizedFileName);
    fs.writeFileSync(filePath, buffer);

    const localUrl = `/uploads/${sanitizedFileName}`;
    return successResponse(
      { url: localUrl, isLocal: true },
      "Image uploaded locally (Add CLOUDINARY credentials in .env.local for automatic cloud storage)"
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return errorResponse(error.message || "Failed to upload file", "SERVER_ERROR", 500);
  }
}
