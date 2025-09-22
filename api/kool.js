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
        outputUrl = link.startsWith("http") ? link : `https://jerrycoder-rembg-as.hf.space${link}`;
        break;
      }
      // wait 2s each try
      await new Promise((r) => setTimeout(r, 2000));
    }

    let buffer, fileName;

    if (outputUrl) {
      // ✅ Success → background removed
      const imgResp = await fetch(outputUrl);
      buffer = Buffer.from(await imgResp.arrayBuffer());
      fileName = "success.png";

      res.setHeader("X-Result", "success");
    } else {
      // ❌ Fallback → return original
      const fallbackResp = await fetch(url);
      buffer = Buffer.from(await fallbackResp.arrayBuffer());
      fileName = "fallback.png";

      res.setHeader("X-Result", "fallback");
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    return res.send(buffer);

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
