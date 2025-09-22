import fetch from "node-fetch";
import FormData from "form-data";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing ?url parameter" });
  }

  try {
    // 1. Download image from target URL
    const imgResp = await fetch(url);
    if (!imgResp.ok) {
      throw new Error("Failed to fetch target image");
    }
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    // 2. Send to Hugging Face Space
    const fd = new FormData();
    fd.append("data", imgBuffer, { filename: "input.png", contentType: "image/png" });

    const hfResp = await fetch("https://jerrycoder-rembg-as.hf.space/api/predict", {
      method: "POST",
      body: fd,
    });

    if (!hfResp.ok) {
      throw new Error(`HF API failed: ${hfResp.status}`);
    }

    const hfData = await hfResp.json();

    if (!hfData.data || !hfData.data[0]) {
      return res.status(500).json({ error: "Hugging Face returned no image" });
    }

    // 3. Convert Base64 → Buffer
    const base64Image = hfData.data[0].replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Image, "base64");

    // 4. Upload to tmpfiles.org
    const tmpForm = new FormData();
    tmpForm.append("file", buffer, { filename: "output.png", contentType: "image/png" });

    const tmpResp = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: tmpForm,
    });

    if (!tmpResp.ok) {
      throw new Error("Tmpfiles upload failed");
    }

    const tmpData = await tmpResp.json();
    if (!tmpData.data || !tmpData.data.url) {
      return res.status(500).json({ error: "Upload failed" });
    }

    // 5. Return JSON with final URL
    return res.status(200).json({
      success: true,
      url: tmpData.data.url,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
