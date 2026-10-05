/**
 * TwingHisabi Smart Studio Product Image Engine
 * Genuine Deep Neural Network AI Background Removal & Studio Compositing
 * 
 * 1. AI Cutout: Uses @imgly/background-removal deep neural network (U2Net/isNet)
 *    to remove messy room clutter, hands, floors, and backgrounds.
 * 2. Fallback heuristic: Multi-point chroma & luminance edge filter if offline.
 * 3. Studio Stage: Composites product onto professional e-commerce backdrops
 *    with realistic multi-layer contact drop shadow & ambient lighting.
 */

import { removeBackground } from '@imgly/background-removal';

export type StudioBackdropStyle = 'clean_white' | 'studio_podium' | 'wooden_table' | 'minimalist_gradient';

export interface StudioEnhanceOptions {
  style?: StudioBackdropStyle;
  brightness?: number; // default 1.04
  contrast?: number; // default 1.08
  saturate?: number; // default 1.12
  shadowOpacity?: number; // default 0.28
  paddingPercent?: number; // default 0.12 (12% padding)
  onProgress?: (percent: number, stepText: string) => void;
}

/**
 * Automatically creates a professional e-commerce product image
 * with deep AI background isolation, studio backdrop, and realistic contact shadow.
 */
export async function enhanceProductPhoto(
  imageSource: string | File,
  options: StudioEnhanceOptions = {}
): Promise<{
  enhancedImageUrl: string;
  originalImageUrl: string;
  style: StudioBackdropStyle;
  cutoutDataUrl?: string;
}> {
  const {
    style = 'clean_white',
    brightness = 1.04,
    contrast = 1.08,
    saturate = 1.12,
    shadowOpacity = 0.28,
    paddingPercent = 0.12,
    onProgress,
  } = options;

  let originalDataUrl: string;

  if (imageSource instanceof File) {
    originalDataUrl = await fileToDataUrl(imageSource);
  } else {
    originalDataUrl = imageSource;
  }

  onProgress?.(15, 'এআই মডেল দিয়ে ব্যাকগ্রাউন্ড আলাদা করা হচ্ছে...');

  let cutoutImg: HTMLImageElement;
  let cutoutDataUrl = '';

  // 1. Try Deep Learning AI Background Removal
  try {
    const blob = await removeBackground(originalDataUrl, {
      model: 'isnet_quint8', // fast quantized neural network, optimal for mobile & browser
      output: {
        format: 'image/png',
        quality: 0.95,
      },
      progress: (key, current, total) => {
        if (total > 0) {
          const pct = Math.min(80, Math.round(15 + (current / total) * 65));
          onProgress?.(pct, 'এআই কাটআউট তৈরি হচ্ছে...');
        }
      },
    });

    cutoutDataUrl = await blobToDataUrl(blob);
    cutoutImg = await loadImage(cutoutDataUrl);
  } catch (aiErr) {
    console.warn('AI neural background removal fallback to canvas heuristic:', aiErr);
    onProgress?.(50, 'স্মার্ট স্টুডিও কাটআউট প্রসেস হচ্ছে...');
    // Fallback to client-side smart canvas edge & chroma isolation
    cutoutDataUrl = await fallbackCanvasCutout(originalDataUrl);
    cutoutImg = await loadImage(cutoutDataUrl);
  }

  onProgress?.(85, 'স্টুডিও লাইটিং ও শ্যাডো যুক্ত করা হচ্ছে...');

  const targetWidth = 800;
  const targetHeight = 800;

  // 2. Scan cutout pixels to find exact product bounding box
  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = cutoutImg.width;
  scanCanvas.height = cutoutImg.height;
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
  if (!scanCtx) {
    return {
      enhancedImageUrl: originalDataUrl,
      originalImageUrl: originalDataUrl,
      style,
    };
  }

  scanCtx.drawImage(cutoutImg, 0, 0);
  const imgData = scanCtx.getImageData(0, 0, cutoutImg.width, cutoutImg.height);
  const pixels = imgData.data;

  let minX = cutoutImg.width, minY = cutoutImg.height, maxX = 0, maxY = 0;
  let nonTransparentCount = 0;

  for (let y = 0; y < cutoutImg.height; y++) {
    for (let x = 0; x < cutoutImg.width; x++) {
      const alpha = pixels[(y * cutoutImg.width + x) * 4 + 3];
      if (alpha > 25) { // Visible pixel
        nonTransparentCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If cutout is somehow empty, use full dimensions
  if (nonTransparentCount < 50 || maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = cutoutImg.width;
    maxY = cutoutImg.height;
  }

  const subjectW = maxX - minX;
  const subjectH = maxY - minY;

  // 3. Create Studio Composite Canvas (800x800 square e-commerce ratio)
  const studioCanvas = document.createElement('canvas');
  studioCanvas.width = targetWidth;
  studioCanvas.height = targetHeight;
  const studioCtx = studioCanvas.getContext('2d');
  if (!studioCtx) {
    return {
      enhancedImageUrl: originalDataUrl,
      originalImageUrl: originalDataUrl,
      style,
    };
  }

  // Draw Selected Professional Studio Backdrop
  drawStudioBackdrop(studioCtx, targetWidth, targetHeight, style);

  // Calculate scaled product positioning
  const maxBoxW = targetWidth * (1 - paddingPercent * 2);
  const maxBoxH = targetHeight * (1 - paddingPercent * 2) - 40; // reserve space for base contact shadow

  const scale = Math.min(maxBoxW / subjectW, maxBoxH / subjectH);
  const drawW = subjectW * scale;
  const drawH = subjectH * scale;

  // Center horizontally, position near base for realistic grounded look
  const posX = (targetWidth - drawW) / 2;
  const posY = targetHeight - drawH - (targetHeight * 0.12);

  // 4. Draw Realistic Contact Shadow beneath product
  drawContactShadow(studioCtx, posX, posY, drawW, drawH, shadowOpacity);

  // 5. Draw Product with Studio Lighting filter (vibrancy + contrast)
  studioCtx.save();
  studioCtx.filter = `contrast(${contrast}) saturate(${saturate}) brightness(${brightness})`;
  studioCtx.drawImage(
    cutoutImg,
    minX, minY, subjectW, subjectH,
    posX, posY, drawW, drawH
  );
  studioCtx.restore();

  // 6. Subtle top highlight vignette for depth
  drawStudioVignette(studioCtx, targetWidth, targetHeight);

  onProgress?.(100, 'সম্পন্ন হয়েছে!');

  // Output as optimized, crisp JPEG
  const enhancedImageUrl = studioCanvas.toDataURL('image/jpeg', 0.90);

  return {
    enhancedImageUrl,
    originalImageUrl: originalDataUrl,
    style,
    cutoutDataUrl,
  };
}

/**
 * Fallback client-side smart canvas edge & chroma isolation
 */
async function fallbackCanvasCutout(originalDataUrl: string): Promise<string> {
  const img = await loadImage(originalDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return originalDataUrl;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imgData.data;

  // Sample perimeter colors (corners + edges)
  const samplePoints = [
    { x: 4, y: 4 },
    { x: img.width - 5, y: 4 },
    { x: 4, y: img.height - 5 },
    { x: img.width - 5, y: img.height - 5 },
    { x: Math.floor(img.width / 2), y: 4 },
    { x: 4, y: Math.floor(img.height / 2) },
    { x: img.width - 5, y: Math.floor(img.height / 2) },
  ];

  let totalR = 0, totalG = 0, totalB = 0;
  samplePoints.forEach((pt) => {
    const idx = (pt.y * img.width + pt.x) * 4;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
  });
  const bgR = totalR / samplePoints.length;
  const bgG = totalG / samplePoints.length;
  const bgB = totalB / samplePoints.length;

  const tolerance = 46;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (dist < tolerance) {
        data[idx + 3] = 0; // Make background transparent
      } else if (dist < tolerance * 1.25) {
        // Soft edge feathering
        data[idx + 3] = Math.min(255, Math.floor(((dist - tolerance) / (tolerance * 0.25)) * 255));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Draws professional backdrops
 */
function drawStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: StudioBackdropStyle
) {
  if (style === 'clean_white') {
    // Pure clean white with soft subtle radial center lighting (Amazon / Apple style)
    const radGrad = ctx.createRadialGradient(
      width / 2, height * 0.45, 20,
      width / 2, height * 0.5, width * 0.75
    );
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.75, '#ffffff');
    radGrad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);

    // Soft base ground gradient
    const groundGrad = ctx.createLinearGradient(0, height * 0.78, 0, height);
    groundGrad.addColorStop(0, 'rgba(241, 245, 249, 0)');
    groundGrad.addColorStop(1, 'rgba(226, 232, 240, 0.4)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
  } else if (style === 'studio_podium') {
    // Studio gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#f1f5f9');
    bgGrad.addColorStop(0.65, '#e2e8f0');
    bgGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Oval 3D Podium
    const podiumX = width / 2;
    const podiumY = height * 0.82;
    const radiusX = width * 0.38;
    const radiusY = height * 0.11;

    // Podium drop shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(podiumX, podiumY + 18, radiusX * 0.95, radiusY * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.filter = 'blur(12px)';
    ctx.fill();
    ctx.restore();

    // Podium cylinder base
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(podiumX, podiumY + 12, radiusX, radiusY, 0, 0, Math.PI);
    ctx.lineTo(podiumX - radiusX, podiumY);
    ctx.ellipse(podiumX, podiumY, radiusX, radiusY, 0, Math.PI, 0);
    ctx.lineTo(podiumX + radiusX, podiumY + 12);
    ctx.fill();

    // Podium cylinder side shading
    const sideGrad = ctx.createLinearGradient(podiumX - radiusX, podiumY, podiumX + radiusX, podiumY);
    sideGrad.addColorStop(0, '#cbd5e1');
    sideGrad.addColorStop(0.5, '#ffffff');
    sideGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = sideGrad;
    ctx.fill();

    // Podium top disc
    const discGrad = ctx.createRadialGradient(
      podiumX, podiumY - 5, 10,
      podiumX, podiumY, radiusX
    );
    discGrad.addColorStop(0, '#ffffff');
    discGrad.addColorStop(0.85, '#f8fafc');
    discGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.ellipse(podiumX, podiumY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Podium rim highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (style === 'wooden_table') {
    // Warm kitchen/natural wood studio backdrop
    const wallGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
    wallGrad.addColorStop(0, '#fffbeb');
    wallGrad.addColorStop(1, '#fef3c7');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height * 0.65);

    // Warm wooden table surface
    const woodGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
    woodGrad.addColorStop(0, '#d97706');
    woodGrad.addColorStop(0.1, '#b45309');
    woodGrad.addColorStop(0.7, '#78350f');
    woodGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, height * 0.65, width, height * 0.35);

    // Subtle wood grain lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    for (let y = height * 0.67; y < height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.3, y - 4, width * 0.7, y + 4, width, y);
      ctx.stroke();
    }
    ctx.restore();
  } else if (style === 'minimalist_gradient') {
    // Modern tech / luxury slate gradient
    const techGrad = ctx.createRadialGradient(
      width / 2, height * 0.35, 30,
      width / 2, height * 0.5, width * 0.8
    );
    techGrad.addColorStop(0, '#f8fafc');
    techGrad.addColorStop(0.5, '#e2e8f0');
    techGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = techGrad;
    ctx.fillRect(0, 0, width, height);

    // Soft reflective horizon
    const lineGrad = ctx.createLinearGradient(0, height * 0.75, width, height * 0.75);
    lineGrad.addColorStop(0, 'rgba(203, 213, 225, 0)');
    lineGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.3)');
    lineGrad.addColorStop(1, 'rgba(203, 213, 225, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, height * 0.75, width, 2);
  }
}

/**
 * Draws soft multi-layer contact shadow under the product base
 */
function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity: number
) {
  const shadowCenterX = x + w / 2;
  const shadowCenterY = y + h - (h * 0.02);
  const shadowRadiusX = (w * 0.44);
  const shadowRadiusY = Math.max(10, h * 0.05);

  ctx.save();

  // Layer 1: Diffuse ambient shadow (wide & soft)
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, shadowCenterY + 4, shadowRadiusX * 1.15, shadowRadiusY * 1.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(15, 23, 42, ${opacity * 0.4})`;
  ctx.filter = 'blur(16px)';
  ctx.fill();

  // Layer 2: Core contact occlusion shadow (narrow & sharp under contact point)
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, shadowCenterY, shadowRadiusX * 0.82, shadowRadiusY * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(15, 23, 42, ${opacity * 0.85})`;
  ctx.filter = 'blur(6px)';
  ctx.fill();

  ctx.restore();
}

/**
 * Subtle vignette for professional depth
 */
function drawStudioVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  const vigGrad = ctx.createRadialGradient(
    width / 2, height / 2, width * 0.45,
    width / 2, height / 2, width * 0.78
  );
  vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vigGrad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
