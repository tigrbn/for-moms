/** Максимальная ширина после сжатия (px) */
const MAX_WIDTH = 1200;
/** Качество JPEG при сжатии (0–1) */
const JPEG_QUALITY = 0.82;
/** Порог размера (байт): если больше — сжимаем */
const COMPRESS_THRESHOLD = 400 * 1024;

/**
 * Сжимает изображение: ресайз по ширине и/или пережатие в JPEG.
 * Возвращает новый File для загрузки.
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const needResize = img.naturalWidth > MAX_WIDTH;
      const needCompress = file.size > COMPRESS_THRESHOLD;
      if (!needResize && !needCompress) {
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (needResize) {
        w = MAX_WIDTH;
        h = Math.round((img.naturalHeight * MAX_WIDTH) / img.naturalWidth);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось загрузить изображение"));
    };
    img.src = url;
  });
}
