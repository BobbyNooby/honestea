// expo-file-system v55+ ships a new class-based API on the main import
// (`File`/`Directory`). We use the simpler functional API from the
// legacy entry — `readAsStringAsync`, `documentDirectory`, etc. The
// legacy API is fully supported in SDK 55 and slated to remain through
// at least SDK 56; revisit when expo deprecates it.
import * as FileSystem from "expo-file-system/legacy"

import type { Attachment } from "@honestea/shared"

import type { ContentBlock } from "@/lib/api/types"

/**
 * Read a single attachment off the local filesystem and turn it into the
 * OpenAI / OR content-block shape (image_url for images, file for PDFs).
 * The chat dispatcher then either sends this verbatim (OR route) or
 * hands it to the Anthropic streamer's translator.
 *
 * Failures bubble up — the caller should surface a toast. Common cause
 * is the picker URI getting evicted before the user actually sends.
 */
async function attachmentToBlock(att: Attachment): Promise<ContentBlock> {
  const base64 = await FileSystem.readAsStringAsync(att.uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const dataUri = `data:${att.mimeType};base64,${base64}`
  if (att.kind === "image") {
    return { type: "image_url", image_url: { url: dataUri } }
  }
  // file (PDF) — OR's file-parser plugin reads `type: "file"` blocks
  // and replaces them with extracted text before the model sees the
  // request. Fall back to a generic filename when the picker didn't
  // surface one.
  return {
    type: "file",
    file: {
      filename: att.filename ?? "attachment.pdf",
      file_data: dataUri,
    },
  }
}

/**
 * Build the request-side content for a message that may carry attached
 * images / files. When there are no attachments, returns the plain text
 * — keeps the request body small for the common case. When attachments
 * exist, returns the OpenAI content-array shape: text block first (if
 * any), then one block per attachment.
 */
export async function buildMessageContent(
  text: string,
  attachments: Attachment[] | null,
): Promise<string | ContentBlock[]> {
  if (!attachments || attachments.length === 0) return text
  const blocks: ContentBlock[] = []
  if (text.trim().length > 0) {
    blocks.push({ type: "text", text })
  }
  for (const att of attachments) {
    blocks.push(await attachmentToBlock(att))
  }
  return blocks
}

/**
 * Copy a picker-returned URI (often a temp cache file) into a stable
 * location under the app's documents directory so re-renders after an
 * app restart still find the image. The picker's original URI may be
 * cleaned up by the OS at any time — we don't want chat history to
 * silently lose images.
 */
export async function persistPickedAttachment(
  pickedUri: string,
  mimeType: string,
): Promise<string> {
  const docs = FileSystem.documentDirectory
  if (!docs) {
    // Web target — `documentDirectory` is null. Just return as-is; the
    // browser already keeps blob URIs alive for the session.
    return pickedUri
  }
  const dir = `${docs}attachments/`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(
    () => {},
  )
  const ext = extensionForMime(mimeType)
  const filename = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const dest = `${dir}${filename}`
  await FileSystem.copyAsync({ from: pickedUri, to: dest })
  return dest
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png"
    case "image/jpeg":
    case "image/jpg":
      return ".jpg"
    case "image/webp":
      return ".webp"
    case "image/gif":
      return ".gif"
    case "application/pdf":
      return ".pdf"
    default:
      return ""
  }
}
