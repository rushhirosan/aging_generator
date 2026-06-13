const HD_MIN_SHORT_SIDE = 1080;
const MAX_LONG_SIDE = 4096;

export async function prepareImageForYouCam(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const short = Math.min(width, height);
  const long = Math.max(width, height);

  // 短辺1080を満たしつつ長辺4096以内に収まるか
  if (short / long < HD_MIN_SHORT_SIDE / MAX_LONG_SIDE) {
    bitmap.close();
    throw new Error("IMAGE_TOO_SMALL");
  }

  let scale = 1;
  if (short < HD_MIN_SHORT_SIDE) {
    scale = HD_MIN_SHORT_SIDE / short;
  }

  let newWidth = Math.round(width * scale);
  let newHeight = Math.round(height * scale);

  const newLong = Math.max(newWidth, newHeight);
  if (newLong > MAX_LONG_SIDE) {
    const downscale = MAX_LONG_SIDE / newLong;
    newWidth = Math.round(newWidth * downscale);
    newHeight = Math.round(newHeight * downscale);
  }

  if (Math.min(newWidth, newHeight) < HD_MIN_SHORT_SIDE) {
    bitmap.close();
    throw new Error("IMAGE_TOO_SMALL");
  }

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("IMAGE_PREPARE_ERROR");
  }

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("IMAGE_PREPARE_ERROR"))),
      "image/jpeg",
      0.92
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "selfie";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
