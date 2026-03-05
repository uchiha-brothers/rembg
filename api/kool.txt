import fetch from "node-fetch";

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
    // 🚀 Send image URL to HuggingFace rembg Space API
    const apiResp = await fetch("https://jerrycoder-rembg-as.hf.space/run/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [url], // rembg usually takes "data" array with one element: input image URL
      }),
    });

    const result = await apiResp.json();

    // ✅ If success → result.data[0] contains a base64 PNG
    if (result && result.data && result.data[0]) {
      const base64 = result.data[0].split(",")[1]; // strip "data:image/png;base64,"
      const buffer = Buffer.from(base64, "base64");

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", 'inline; filename="success.png"');
      res.setHeader("X-Result", "success");
      return res.send(buffer);
    }

    // ❌ If API failed → fallback to original image
    const fallbackResp = await fetch(url);
    const buffer = Buffer.from(await fallbackResp.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="fallback.png"');
    res.setHeader("X-Result", "fallback");
    return res.send(buffer);

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
