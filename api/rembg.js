import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing ?url parameter" });
  }

  try {
    // Step 1: Ask Hugging Face Space to process image
    // Just open the UI page with the image param
    const hfUrl = `https://jerrycoder-rembg-as.hf.space/?image=${encodeURIComponent(url)}`;
    const resp = await fetch(hfUrl, { headers: { "User-Agent": "Mozilla/5.0" } });

    if (!resp.ok) {
      throw new Error(`HF request failed with ${resp.status}`);
    }

    const html = await resp.text();

    // Step 2: Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Look for tmpfiles.org link
    const tmpUrl = $("a[href*='tmpfiles.org']").attr("href");

    if (!tmpUrl) {
      return res.status(500).json({ error: "Failed to extract image URL" });
    }

    // Step 3: Return JSON response
    return res.status(200).json({
      success: true,
      url: tmpUrl,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
