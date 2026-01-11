/**
 * Image upload utility for handling profile photos
 * Stores images as base64 strings in MongoDB
 */

/**
 * Convert file buffer to base64 data URL
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg')
 * @returns {string} Base64 data URL
 */
export function bufferToBase64(buffer, mimeType = "image/jpeg") {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Parse base64 data URL back to buffer and mime type
 * @param {string} dataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @returns {{buffer: Buffer, mimeType: string} | null}
 */
export function base64ToBuffer(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    return null;
  }

  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    return null;
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  return { buffer, mimeType };
}

/**
 * Validate image file
 * @param {Object} file - Multer file object with buffer, size, and mimetype
 * @param {number} maxSizeBytes - Maximum file size in bytes (default: 5MB)
 * @returns {{valid: boolean, error?: string}}
 */
export function validateImageFile(file, maxSizeBytes = 5 * 1024 * 1024) {
  // Check if file exists
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Check file size (multer provides file.size in bytes)
  const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeBytes / 1024 / 1024}MB`,
    };
  }

  // Check MIME type (allow common image formats)
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
    };
  }

  return { valid: true };
}

