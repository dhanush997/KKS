import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "kk_brand_logo_1780680510511.png");
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Logo file not found in workspace root.", { status: 404 });
    }
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving brand logo:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
