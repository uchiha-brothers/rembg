import fetch from "node-fetch";
import FormData from "form-data";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Image URL required ?url=" });

  try {
    // 1. Download the original image
    const imgResponse = await fetch(url);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    // 2. Encode as Data URI for Hugging Face
    const base64Input = `data:image/png;base64,${buffer.toString("base64")}`;

    // 3. Send to Hugging Face Space
    const hfResponse = await fetch(
      "https://jerrycoder-rembg-as.hf.space/run/remove_bg", // try /predict if /remove_bg fails
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [base64Input] })
      }
    );

    const result = await hfResponse.json();

    if (!result?.data?.[0]) {
      throw new Error("Hugging Face returned no image");
    }

    // 4. Extract image
    let base64Image = result.data[0];
    if (base64Image.startsWith("data:image")) {
      base64Image = base64Image.split(",")[1];
    }
    const outputBuffer = Buffer.from(base64Image, "base64");

    // 5. Upload to tmpfiles.org
    const form = new FormData();
    form.append("file", outputBuffer, { filename: "output.png" });

    const tmpResponse = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: form
    });

    const tmpResult = await tmpResponse.json();

    if (!tmpResult?.data?.url) {
      throw new Error("Failed to upload to tmpfiles.org");
    }

    // 6. Return the temporary file link
    res.status(200).json({ url: tmpResult.data.url });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
