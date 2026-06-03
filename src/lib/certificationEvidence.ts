/**
 * Prepare certificate evidence for POST /qualifications-certification/create.
 * - Images: full data URL string (data:image/png;base64,...) — required by API
 * - PDF/DOC/etc.: raw File via multipart FormData
 */
export async function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.length > 0) {
        resolve(result);
        return;
      }
      reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

export async function prepareCertificationEvidence(
  file: File
): Promise<string | File> {
  if (file.type.startsWith("image/")) {
    return fileToBase64DataUrl(file);
  }
  return file;
}
