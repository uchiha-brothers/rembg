import fetch from "node-fetch";
import * as cheerio from "cheerio";
import FormData from "form-data";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Image URL required ?url=" });

  try {
    // 1. Send request to HuggingFace Space (simulate user uploading an image URL)
    const form = new FormData();
    form.append("data", url);

    const response = await fetch("https://jerrycoder-rembg-as.hf.space/", {
      method: "POST",
      body: form,
    });

    const html = await response.text();

    // 2. Parse with cheerio
    const $ = cheerio.load(html);

    // Try to locate result image in the "Result with Transparent Background" block
    let imgSrc = $("div#output-image img").attr("src");

    // fallback: grab second image (since left=original, right=processed)
    if (!imgSrc) {
      const imgs = $("img").map((i, el) => $(el).attr("src")).get();
      imgSrc = imgs.length > 1 ? imgs[1] : imgs[0];
    }

    if (!imgSrc) {
      throw new Error("Could not find processed image in HuggingFace page");
    }

    // 3. Download the result image
    const imgResponse = await fetch(
      imgSrc.startsWith("http") ? imgSrc : `https://jerrycoder-rembg-as.hf.space${imgSrc}`
    );
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    // 4. Upload to tmpfiles.org
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

    // 5. Respond with temporary download URL
    res.status(200).json({ url: tmpJson.data.url });

  } catch (err) {
    console.error("Scraper Error:", err);
    res.status(500).json({ error: err.message });
  }
}
