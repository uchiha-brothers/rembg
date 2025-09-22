import fetch from "node-fetch";
import * as cheerio from "cheerio";
import FormData from "form-data";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Image URL required ?url=" });

  try {
    // 1. Upload image to your HuggingFace space (simulate user upload)
    const form = new FormData();
    form.append("data", url); // Gradio accepts image URL as "data"

    const response = await fetch("https://jerrycoder-rembg-as.hf.space/", {
      method: "POST",
      body: form,
    });

    const html = await response.text();

    // 2. Load the page with cheerio
    const $ = cheerio.load(html);

    // 3. Find the <img> tag with processed image
    const imgSrc = $("img").attr("src");

    if (!imgSrc) {
      throw new Error("Could not find image in HuggingFace response");
    }

    // 4. Download that image
    const imgResponse = await fetch(imgSrc.startsWith("http") ? imgSrc : `https://jerrycoder-rembg-as.hf.space${imgSrc}`);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    // 5. Upload to tmpfiles.org
    const formUpload = new FormData();
    formUpload.append("file", buffer, { filename: "output.png" });

    const tmpRes = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formUpload,
    });

    const tmpJson = await tmpRes.json();

    if (!tmpJson?.data?.url) {
      throw new Error("Upload to tmpfiles.org failed");
    }

    // 6. Return temporary download link
    res.status(200).json({ url: tmpJson.data.url });

  } catch (err) {
    console.error("Scraper Error:", err);
    res.status(500).json({ error: err.message });
  }
}
