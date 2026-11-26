const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImage(file) {
  if (!file) return "";

  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
    return "Choose a JPG, PNG, or WEBP photo no larger than 5 MB.";
  }

  return "";
}
