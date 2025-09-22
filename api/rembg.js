import fetch from "node-fetch";
import sharp from "sharp";

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing ?url parameter" });
    }

    // 1. Download the target image
    const imgResp = await fetch(url);
    if (!imgResp.ok) {
      return res.status(400).json({ error: "Failed to fetc target image" });
    }
    const buffer = Buffer.from(await imgResp.arrayBuffer());

    // 2. Convert image to base64 for HuggingFace API
    const base64Image = "data:image/png;base64," + buffer.toString("base64");

    // 3. Call your HuggingFace Space API
    const hfResp = await fetch("https://JerryCoder-rembg-as.hf.space/run/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [base64Image] }),
    });

    if (!hfResp.ok) {
      return res.status(500).json({ error: "Invalid response from Hugging Face API" });
    }

    const result = await hfResp.json();
    if (!result.data || !result.data[0]) {
      return res.status(500).json({ error: "No data returned from Hugging Face API" });
    }

    // 4. Extract base64 result
    const outputBase64 = result.data[0].replace(/^data:image\/\w+;base64,/, "");
    const outputBuffer = Buffer.from(outputBase64, "base64");

    // 5. Optimize (optional: convert to PNG via sharp)
    const finalImage = await sharp(outputBuffer).png().toBuffer();

    // 6. Send image back to browser
    res.setHeader("Content-Type", "image/png");
    res.send(finalImage);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
