"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { copy } from "@/config/admin";
import { uploadBlogImage } from "@/hooks/use-blogs";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/api-contract";
import { IMAGE_UPLOAD } from "@/lib/blog-contract";

const f = copy.blogs.editor.fields;

/**
 * Upload / replace / remove one image. The file goes to the RBAC-gated upload
 * route — the browser never holds a storage credential — and the field stores
 * only the resulting public URL.
 */
export function ImageField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > IMAGE_UPLOAD.maxBytes) {
      setError("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadBlogImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary stored URL; next/image would need every host allowlisted.
        <img src={value} alt="" className="aspect-[3/2] w-full rounded-md border object-cover" />
      ) : (
        <div className="flex aspect-[3/2] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          <ImageUp className="mr-2 size-4" aria-hidden="true" />
          {f.imageRules}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? f.uploading : value ? f.replace : f.upload}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => onChange(null)}>
            <Trash2 className="mr-1 size-3.5" aria-hidden="true" />
            {f.remove}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
          {/* Opens in a new tab so the unsaved article is not lost to the navigation. */}
          {error === SESSION_EXPIRED_MESSAGE ? (
            <>
              {" "}
              <a href="/login" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                Open sign-in
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      <input
        id={id}
        ref={input}
        type="file"
        accept={IMAGE_UPLOAD.types.join(",")}
        className="hidden"
        onChange={(event) => void handle(event.target.files?.[0])}
      />
    </div>
  );
}
