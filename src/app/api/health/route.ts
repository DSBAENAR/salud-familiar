import { NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/uploads";
import fs from "fs";
import path from "path";

export async function GET() {
  const exists = fs.existsSync(UPLOADS_DIR);
  let files: string[] = [];

  if (exists) {
    function walk(dir: string, prefix = "") {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const rel = path.join(prefix, entry.name);
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name), rel);
          } else {
            files.push(rel);
          }
        }
      } catch { /* ignore */ }
    }
    walk(UPLOADS_DIR);
  }

  return NextResponse.json({
    status: "ok",
    uploadsDir: UPLOADS_DIR,
    uploadsDirExists: exists,
    fileCount: files.length,
    files: files.slice(0, 50),
    cwd: process.cwd(),
  });
}
