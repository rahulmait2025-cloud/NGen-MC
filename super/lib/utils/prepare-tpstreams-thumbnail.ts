/** Prepare image file for TPStreams thumbnail upload (PNG/JPEG only). */

const TPSTREAMS_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

function convertToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not process image'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Could not convert WebP to JPEG'));
            return;
          }
          const name = file.name.replace(/\.webp$/i, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image file'));
    };
    img.src = url;
  });
}

/** TPStreams accepts PNG/JPEG — convert WebP client-side before server upload. */
export async function prepareTpStreamsThumbnailFile(file: File): Promise<File> {
  if (TPSTREAMS_TYPES.has(file.type)) return file;
  if (file.type === 'image/webp') return convertToJpeg(file);
  throw new Error('Thumbnail must be PNG, JPEG, or WebP');
}
