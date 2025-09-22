import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing ?url param" });
  }

  try {
    // Step 1: Send request to Hugging Face Space (simulate user submission)
    await fetch("https://jerrycoder-rembg-as.hf.space", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: url }).toString(),
    });

    // Step 2: Poll until we find tmpfiles.org link in HTML
    let outputUrl = null;
    for (let i = 0; i < 6; i++) { // up to ~18s total
      const resp = await fetch("https://jerrycoder-rembg-as.hf.space");
      const html = await resp.text();
      const $ = cheerio.load(html);

      // Look for tmpfiles.org link
      const link = $("a[href*='tmpfiles.org']").attr("href");
      if (link) {
        outputUrl = link;
        break;
      }
      await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
    }

    if (!outputUrl) {
      return res.status(500).json({ error: "Failed to extract image URL" });
    }

    res.status(200).json({ success: true, url: outputUrl });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
