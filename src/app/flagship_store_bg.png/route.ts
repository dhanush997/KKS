import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "flagship_store_bg_1780679326638.png");
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Background file not found in workspace root.", { status: 404 });
    }
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving background image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
