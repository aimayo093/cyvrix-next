import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/same-origin";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const PUBLIC_MEDIA_BUCKET = "public-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type TrustedImage = {
  extension: "png" | "jpg" | "webp";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

function canPublishPublicMedia(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CONTENT_MANAGER";
}

function detectImage(buffer: Buffer): TrustedImage | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
}

export async function POST(req: Request) {
  // Refused before anything else runs. See lib/same-origin.ts.
  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPublishPublicMedia(session.user.role)) {
    return NextResponse.json({ error: "You do not have permission to publish public media." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const formFile = formData.get("file");
    if (!(formFile instanceof File)) {
      return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
    }

    if (formFile.size === 0 || formFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image files must be between 1 byte and 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await formFile.arrayBuffer());
    const image = detectImage(buffer);
    if (!image) {
      return NextResponse.json({ error: "Upload a validated PNG, JPEG, or WebP image under 5MB." }, { status: 422 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[admin-upload] Approved public media storage is not configured.");
      return NextResponse.json(
        { error: "Image storage is not configured. Ask an administrator to configure the approved public-media bucket." },
        { status: 503 }
      );
    }

    const assetId = crypto.randomUUID();
    const storagePath = `cms/${assetId}.${image.extension}`;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: uploadError } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).upload(storagePath, buffer, {
      contentType: image.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

    if (uploadError) {
      console.error("[admin-upload] Public media upload failed.", { message: uploadError.message });
      return NextResponse.json(
        { error: "The approved public-media bucket could not accept this image. No image was published." },
        { status: 502 }
      );
    }

    const { data: publicUrlData } = supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;
    if (!publicUrl) {
      const { error: cleanupError } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove([storagePath]);
      console.error("[admin-upload] Public URL generation failed.", { cleanupFailed: Boolean(cleanupError) });
      return NextResponse.json(
        { error: "The image URL could not be created. Storage cleanup has been requested; do not retry until this is resolved." },
        { status: 502 }
      );
    }

    try {
      await prisma.$transaction([
        prisma.mediaAsset.create({
          data: {
            id: assetId,
            filename: `${assetId}.${image.extension}`,
            url: publicUrl,
            mimeType: image.mimeType,
            sizeBytes: BigInt(formFile.size),
            category: "page_asset",
            bucket: PUBLIC_MEDIA_BUCKET,
            filePath: storagePath,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: session.user.email,
          },
        }),
        prisma.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            action: "public_media_uploaded",
            entityType: "MediaAsset",
            entityId: assetId,
            ipAddress: clientIp(req),
            metadata: { bucket: PUBLIC_MEDIA_BUCKET, storagePath, mimeType: image.mimeType, sizeBytes: formFile.size },
          },
        }),
      ]);
    } catch (metadataError) {
      const { error: cleanupError } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove([storagePath]);
      console.error("[admin-upload] Failed to record uploaded media metadata.", {
        message: metadataError instanceof Error ? metadataError.message : "Unknown error",
        cleanupFailed: Boolean(cleanupError),
      });
      return NextResponse.json(
        { error: "The image could not be recorded. Storage cleanup has been requested; do not retry until this is resolved." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error) {
    console.error("[admin-upload] Unexpected upload error.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }
}
