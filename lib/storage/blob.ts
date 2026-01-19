import { put, del, list } from "@vercel/blob"

/**
 * Check if Vercel Blob is configured
 */
export function isBlobConfigured(): boolean {
    return !!process.env.BLOB_READ_WRITE_TOKEN
}

/**
 * Upload a file to Vercel Blob storage
 * @param buffer - File content as Buffer or Blob
 * @param filename - Desired filename with extension
 * @param options - Additional options like content type
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
    buffer: Buffer | Blob,
    filename: string,
    options?: {
        contentType?: string
        access?: "public"
    }
): Promise<string> {
    if (!isBlobConfigured()) {
        throw new Error("Vercel Blob not configured - set BLOB_READ_WRITE_TOKEN")
    }

    const blob = await put(filename, buffer, {
        access: options?.access ?? "public",
        contentType: options?.contentType,
    })

    return blob.url
}

/**
 * Delete a file from Vercel Blob storage
 * @param url - The full Blob URL to delete
 */
export async function deleteFile(url: string): Promise<void> {
    if (!isBlobConfigured()) {
        throw new Error("Vercel Blob not configured - set BLOB_READ_WRITE_TOKEN")
    }

    await del(url)
}

/**
 * List files in Vercel Blob storage
 * @param prefix - Optional prefix to filter files
 * @returns Array of blob metadata
 */
export async function listFiles(prefix?: string) {
    if (!isBlobConfigured()) {
        throw new Error("Vercel Blob not configured - set BLOB_READ_WRITE_TOKEN")
    }

    const { blobs } = await list({ prefix })
    return blobs
}

/**
 * Get content type from filename extension
 */
export function getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase()
    const types: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        mp4: "video/mp4",
        webm: "video/webm",
        json: "application/json",
        txt: "text/plain",
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        ts: "text/typescript",
    }
    return types[ext ?? ""] ?? "application/octet-stream"
}
