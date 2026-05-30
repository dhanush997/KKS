import crypto from "crypto";

/**
 * Uploads a base64 image or file URL to Cloudinary using secure signed REST API.
 * Uses a mock fallback if Cloudinary credentials are not provided.
 * 
 * @param fileStr - Base64 data string (e.g. data:image/png;base64,...) or image URL
 * @param folder - Folder path in Cloudinary
 */
export async function uploadToCloudinary(fileStr: string, folder: string = "fashion-store"): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Fallback to Unsplash if Cloudinary isn't configured
  if (!cloudName || !apiKey || !apiSecret || cloudName === "your_cloudinary_cloud_name") {
    console.warn("Cloudinary credentials are not set. Using sample Unsplash image.");
    // If it's a URL already, just return it, otherwise return a default fashion photo
    if (fileStr.startsWith("http")) {
      return fileStr;
    }
    return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800";
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    
    // Sort parameters alphabetically to sign
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

    const formData = new FormData();
    formData.append("file", fileStr);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Cloudinary Upload API Error");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed, falling back:", error);
    if (fileStr.startsWith("http")) {
      return fileStr;
    }
    return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800";
  }
}
