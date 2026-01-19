import { put, del } from "@vercel/blob"

export function isBlobConfigured(): boolean {
    return !!process.env.BLOB_READ_WRITE_TOKEN
}

export async function uploadFile(
    content: Buffer | string,
    filename: string,
    options?: { contentType?: string }
): Promise<string> {
    if (!isBlobConfigured()) {
        throw new Error("Vercel Blob is not configured")
    }

    try {
        const blob = await put(filename, content, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: options?.contentType
        })
        return blob.url
    } catch (error) {
        console.error("Failed to upload file:", error)
        throw error
    }
}

export async function deleteFile(url: string): Promise<void> {
    if (!isBlobConfigured()) return

    try {
        await del(url, {
            token: process.env.BLOB_READ_WRITE_TOKEN
        })
    } catch (error) {
        console.error("Failed to delete file:", error)
    }
}

export function getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'png': return 'image/png'
        case 'jpg':
        case 'jpeg': return 'image/jpeg'
        case 'gif': return 'image/gif'
        case 'webp': return 'image/webp'
        case 'json': return 'application/json'
        case 'txt': return 'text/plain'
        case 'js':
        case 'ts': return 'text/javascript'
        default: return 'application/octet-stream'
    }
}

export async function uploadSnapshot(imageBuffer: Buffer, filename: string): Promise<string> {
    try {
        // Reuse uploadFile but maintain the fail-safe behavior (return empty string on error)
        return await uploadFile(imageBuffer, filename)
    } catch {
        return ""
    }
}
