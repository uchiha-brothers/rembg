import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Image URL required ?url=" });
  }

  try {
    // 1. Download input image
    const imgResponse = await fetch(url);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    // 2. Send to Hugging Face Space (Gradio API)
    const hfResponse = await fetch(
      "https://jerrycoder-rembg-as.hf.space/run/predict",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [buffer.toString("base64")] // send as base64
        })
      }
    );

    const result = await hfResponse.json();

    if (!result || !result.data || !result.data[0]) {
      throw new Error("Hugging Face returned no image");
    }

    // 3. Extract base64 (strip "data:image/png;base64,")
    let base64Image = result.data[0];
    if (base64Image.startsWith("data:image")) {
      base64Image = base64Image.split(",")[1];
    }

    const output = Buffer.from(base64Image, "base64");

    // 4. Send image directly to browser
    res.setHeader("Content-Type", "image/png");
    res.send(output);

  } catch (err) {
    console.error("Rembg API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
