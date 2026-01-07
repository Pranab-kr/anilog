"use client";

import { useState, useCallback } from "react";
import { useUploadThing } from "@/lib/uploadthing/client";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, disabled }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { startUpload } = useUploadThing("mediaCover", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        onChange(res[0].ufsUrl);
      }
      setIsUploading(false);
    },
    onUploadError: (error) => {
      setUploadError(error.message);
      setIsUploading(false);
    },
  });

  const handleFileChange = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    await startUpload(files);
  };

  const handleRemove = () => {
    onChange(null);
  };

  if (value) {
    return (
      <div className="relative w-full">
        <div className="relative aspect-[3/4] w-32 rounded-lg overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover image"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {isUploading ? (
        <div className="flex flex-col items-center justify-center h-32 w-full border border-dashed rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
        </div>
      ) : (
        <FileUpload onChange={handleFileChange} />
      )}

      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  );
}

