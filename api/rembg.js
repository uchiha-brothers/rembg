import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing ?url=" });
    }

    // Send image URL to your HuggingFace Space
    const response = await fetch("https://jerrycoder-rembg-as.hf.space/api/predict/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: [url] // Gradio API expects an array
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Hugging Face request failed" });
    }

    const result = await response.json();

    // result.data usually contains HTML with tmpfiles.org link
    const html = JSON.stringify(result);
    const $ = cheerio.load(html);

    let tmpLink;
    $("a").each((_, el) => {
      const link = $(el).attr("href");
      if (link && link.includes("tmpfiles.org")) {
        tmpLink = link;
      }
    });

    if (!tmpLink) {
      return res.status(500).json({ error: "Could not extract tmpfiles.org link" });
    }

    return res.status(200).json({ success: true, output_url: tmpLink });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
}
