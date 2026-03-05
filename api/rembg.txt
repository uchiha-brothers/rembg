import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing ?url param" });
  }

  try {
    // Step 1: Trigger the Hugging Face Space
    await fetch("https://jerrycoder-rembg-as.hf.space", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: url }).toString(),
    });

    // Step 2: Poll until we find the tmpfiles.org link
    let outputUrl = null;
    for (let i = 0; i < 6; i++) {
      const resp = await fetch("https://jerrycoder-rembg-as.hf.space");
      const html = await resp.text();
      const $ = cheerio.load(html);

      const link = $("a[href*='tmpfiles.org']").attr("href");
      if (link) {
        outputUrl = link;
        break;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    // ✅ If we got a tmpfiles link → return JSON
    if (outputUrl) {
      return res.status(200).json({ success: true, url: outputUrl });
    }

    // ❌ If no link → fallback: fetch image as base64
    const fallbackResp = await fetch(url);
    const buffer = await fallbackResp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return res.status(200).json({
      success: true,
      base64: `data:image/png;base64,${base64}`,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
