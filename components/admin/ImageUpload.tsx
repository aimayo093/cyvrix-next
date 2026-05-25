"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  name: string;
  defaultValue?: string;
  className?: string;
}

export function ImageUpload({ name, defaultValue, className = "" }: ImageUploadProps) {
  const [url, setUrl] = useState<string | undefined>(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError("File size must be under 5MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await res.json();
      setUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setUrl(undefined);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <input type="hidden" name={name} value={url || ""} />
      
      {url ? (
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden w-full aspect-video sm:w-80 group">
          <Image
            src={url}
            alt="Uploaded preview"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={handleRemove}
              className="bg-white text-rose-600 px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg hover:bg-rose-50 flex items-center gap-2 transition-colors"
            >
              <X className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors w-full sm:w-80 aspect-video ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-[#2691F0] animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-700">Uploading...</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">Click to upload image</p>
              <p className="text-xs text-slate-400">PNG, JPG, WebP up to 5MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-500 font-bold flex items-center gap-1"><X className="h-4 w-4" /> {error}</p>}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
