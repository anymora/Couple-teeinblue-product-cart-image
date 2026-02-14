import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { fetchAndCrop } from "./src/cropper.js";
import { validateAndNormalizeParams } from "./src/security.js";

const app = express();

app.use(helmet({
  // We serve images; keep defaults safe
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan("combined"));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * GET /crop?src=<url>&focus=left|right&width=700&height=700
 *
 * - src: required
 * - focus: left/right (required)
 * - width/height: optional (defaults from env)
 */
app.get("/crop", async (req, res) => {
  let params;
  try {
    params = validateAndNormalizeParams(req.query);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const { buffer, contentType, etag } = await fetchAndCrop(params);

    // Strong caching: URL is deterministic (src+focus+size)
    // If you later put Cloudflare in front, it will cache effectively.
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);

    // Simple conditional request support
    if (req.headers["if-none-match"] && req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("CROP_ERROR:", err);
    return res.status(500).json({ error: "Failed to process image" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Image cropper listening on port ${port}`);
});
