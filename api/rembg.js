import fetch from "node-fetch";
import sharp from "sharp";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Image URL required ?url=" });
  }

  try {
    // 1. Download input image
    const imgResponse = await fetch(url);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    // 2. Send to Hugging Face Space
    const hfResponse = await fetch(
      "https://jerrycoder-rembg-as.hf.space/run/predict",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [buffer.toString("base64")] })
      }
    );

    const result = await hfResponse.json();

    if (!result || !result.data) {
      throw new Error("Invalid response from Hugging Face API");
    }

    // 3. Convert HuggingFace output back to buffer
    const output = Buffer.from(result.data[0], "base64");

    // 4. Send image directly to browser
    res.setHeader("Content-Type", "image/png");
    res.send(output);

  } catch (err) {
    console.error("Rembg API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
