import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type (basic check)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create safe filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, ""); // sanitize
    const filename = `${uniqueSuffix}-${originalName}`;

    let publicUrl = "";
    let storagePath = filename;
    let uploadedToSupabase = false;

    // Attempt Supabase Storage Upload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Prefer service role key if available for administrative uploads, fallback to anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
          },
        });

        const bucketName = "public-media";
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filename, buffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          console.error("Supabase Storage upload error, falling back to local:", error);
        } else if (data) {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filename);
          
          if (publicUrlData?.publicUrl) {
            publicUrl = publicUrlData.publicUrl;
            storagePath = filename;
            uploadedToSupabase = true;
          }
        }
      } catch (err) {
        console.error("Supabase client error, falling back to local:", err);
      }
    }

    // Local Disk Fallback
    if (!uploadedToSupabase) {
      const uploadDir = join(process.cwd(), "public", "uploads");

      // Ensure dir exists
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      publicUrl = `/uploads/${filename}`;
      storagePath = filepath;
    }

    // Store in media_assets table
    try {
      await prisma.mediaAsset.create({
        data: {
          id: crypto.randomUUID(),
          filename,
          url: publicUrl,
          mimeType: file.type,
          sizeBytes: BigInt(file.size),
          category: "page_asset",
          bucket: uploadedToSupabase ? "public-media" : "local",
          filePath: storagePath,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: session.email,
        },
      });
    } catch (dbErr) {
      console.error("Failed to store asset metadata in database:", dbErr);
      // We still return the publicUrl so the upload doesn't break in the UI
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
