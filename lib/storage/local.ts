import fs from "fs/promises"
import path from "path"

const PUBLIC_DIR = path.join(process.cwd(), "public")
const MEDIA_ROOT_DIR = path.resolve(process.env.MEDIA_ROOT_DIR ?? PUBLIC_DIR)
const MEDIA_ROOT_REL = path.relative(PUBLIC_DIR, MEDIA_ROOT_DIR)
const MEDIA_ROOT_WITHIN_PUBLIC =
  MEDIA_ROOT_REL === "" || (!MEDIA_ROOT_REL.startsWith("..") && !path.isAbsolute(MEDIA_ROOT_REL))

function normalizeRelativePath(inputPath: string): string {
  const stripped = inputPath.split("?")[0].split("#")[0]
  const cleaned = stripped.replace(/\\/g, "/").replace(/^\/+/, "").trim()
  if (!cleaned) throw new Error("Invalid storage path: empty filename")

  const normalized = path.posix.normalize(cleaned)
  if (normalized === "." || normalized.startsWith("..") || normalized.includes("../")) {
    throw new Error(`Invalid storage path: ${inputPath}`)
  }

  return normalized
}

function resolveMediaPath(filename: string): { absPath: string; relPath: string } {
  const relPath = normalizeRelativePath(filename)
  const absPath = path.resolve(MEDIA_ROOT_DIR, relPath)
  const relativeToRoot = path.relative(MEDIA_ROOT_DIR, absPath)

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Storage path escapes media root: ${filename}`)
  }

  return { absPath, relPath }
}

function toPublicUrl(relPath: string): string {
  if (!MEDIA_ROOT_WITHIN_PUBLIC) {
    throw new Error("MEDIA_ROOT_DIR must be inside the public directory to serve files")
  }

  const base = MEDIA_ROOT_REL ? MEDIA_ROOT_REL.replace(/\\/g, "/") : ""
  const fullPath = base ? `/${base}/${relPath}` : `/${relPath}`
  return fullPath.replace(/\\/g, "/")
}

function isLocalUrl(url: string): boolean {
  return !url.startsWith("http://") && !url.startsWith("https://")
}

export function isBlobConfigured(): boolean {
  return true
}

export async function uploadFile(
  content: Buffer | string,
  filename: string,
  options?: { contentType?: string }
): Promise<string> {
  const { absPath, relPath } = resolveMediaPath(filename)
  await fs.mkdir(path.dirname(absPath), { recursive: true })
  await fs.writeFile(absPath, content)

  return toPublicUrl(relPath)
}

export async function deleteFile(url: string): Promise<void> {
  if (!url || !isLocalUrl(url) || url.startsWith("data:")) return

  const { absPath } = resolveMediaPath(url)
  try {
    await fs.unlink(absPath)
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.error("Failed to delete local file:", error)
    }
  }
}

export function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "png":
      return "image/png"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "gif":
      return "image/gif"
    case "webp":
      return "image/webp"
    case "json":
      return "application/json"
    case "txt":
      return "text/plain"
    case "js":
    case "ts":
      return "text/javascript"
    case "md":
      return "text/markdown"
    default:
      return "application/octet-stream"
  }
}

export async function uploadSnapshot(imageBuffer: Buffer, filename: string): Promise<string> {
  try {
    return await uploadFile(imageBuffer, filename)
  } catch {
    return ""
  }
}
