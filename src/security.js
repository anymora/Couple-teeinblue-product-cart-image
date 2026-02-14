import { URL } from "url";

const allowedHosts = (process.env.ALLOWED_HOSTS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function mustInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function mustFloat(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function validateAndNormalizeParams(query) {
  const src = query.src;
  const focus = (query.focus || "").toLowerCase();

  if (!src) throw new Error("Missing required parameter: src");
  if (focus !== "left" && focus !== "right") throw new Error("Invalid focus. Use left or right.");

  let u;
  try {
    u = new URL(src);
  } catch {
    throw new Error("Invalid src URL");
  }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Invalid src URL protocol");
  }

  // SSRF protection: allow only known hosts
  if (allowedHosts.length > 0 && !allowedHosts.includes(u.hostname)) {
    throw new Error(`Host not allowed: ${u.hostname}`);
  }

  const DEFAULT_WIDTH = mustInt(process.env.DEFAULT_WIDTH, 700);
  const DEFAULT_HEIGHT = mustInt(process.env.DEFAULT_HEIGHT, 700);

  const width = mustInt(query.width, DEFAULT_WIDTH);
  const height = mustInt(query.height, DEFAULT_HEIGHT);

  const CUT_PERCENT = mustFloat(process.env.CUT_PERCENT, 0.30);
  const ZOOM = mustFloat(process.env.ZOOM, 1.20);
  const JPEG_QUALITY = mustInt(process.env.JPEG_QUALITY, 85);

  // Hard limits to avoid abuse
  const safeWidth = Math.min(Math.max(width, 50), 2000);
  const safeHeight = Math.min(Math.max(height, 50), 2000);

  const safeCut = Math.min(Math.max(CUT_PERCENT, 0.0), 0.60); // cap 60%
  const safeZoom = Math.min(Math.max(ZOOM, 1.0), 2.0);
  const safeQuality = Math.min(Math.max(JPEG_QUALITY, 40), 95);

  return {
    src: u.toString(),
    focus,
    width: safeWidth,
    height: safeHeight,
    cutPercent: safeCut,
    zoom: safeZoom,
    jpegQuality: safeQuality
  };
}
