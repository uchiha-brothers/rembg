export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing ?url parameter" });
  }

  try {
    // 1. Fetch the image from the given URL
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) throw new Error("Failed to fetch input image");
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 2. Send to your Hugging Face Space API
    const hfResponse = await fetch(
      "https://JerryCoder-rembg-as.hf.space/run/predict",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [imageBuffer.toString("base64")], // base64 encode input
        }),
      }
    );

    const result = await hfResponse.json();
    if (!result || !result.data || !result.data[0]) {
      throw new Error("Invalid response from Hugging Face API");
    }

    // 3. Decode output image from base64
    const outputBase64 = result.data[0].split(",")[1] || result.data[0];
    const outputBuffer = Buffer.from(outputBase64, "base64");

    // 4. Stream back as PNG image
    res.setHeader("Content-Type", "image/png");
    res.send(outputBuffer);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}
