import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * The private bucket for company and tender documents (D5).
 *
 * The bucket has no storage policies, so only this server's service role can
 * read or write it. People get a five-minute signed link after the admin check.
 */
export const COMPANY_DOCUMENTS_BUCKET = "company-documents";
export const SIGNED_URL_SECONDS = 300;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function storeDocument(path: string, buffer: Buffer, contentType: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = serviceClient();
  if (!client) return { ok: false, reason: "Document storage is not configured." };
  const { error } = await client.storage
    .from(COMPANY_DOCUMENTS_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) {
    console.error("[procurement] document upload failed", error.name);
    return { ok: false, reason: "The file could not be stored. Nothing was saved." };
  }
  return { ok: true };
}

export async function signedDocumentUrl(path: string, downloadName: string): Promise<string | null> {
  const client = serviceClient();
  if (!client) return null;
  const { data, error } = await client.storage
    .from(COMPANY_DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS, { download: downloadName });
  if (error || !data?.signedUrl) {
    console.error("[procurement] signed URL failed", error?.name ?? "no url");
    return null;
  }
  return data.signedUrl;
}
