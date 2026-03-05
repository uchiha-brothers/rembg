// /api/videos.js
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase GET failed:", error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json(data || [])
    }

    if (req.method === "POST") {
      const { title, url } = req.body

      if (!title || !url) {
        return res.status(400).json({ error: "Missing title or URL" })
      }

      // Check for duplicate title safely
      const { data: existing, error: checkError } = await supabase
        .from("videos")
        .select("*")
        .eq("title", title)

      if (checkError) {
        console.error("Supabase duplicate check failed:", checkError)
        return res.status(500).json({ error: checkError.message })
      }

      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Title already exists" })
      }

      // Insert new video safely
      const { error: insertError } = await supabase
        .from("videos")
        .insert({ title, url })

      if (insertError) {
        console.error("Supabase insert failed:", insertError)
        return res.status(500).json({ error: insertError.message })
      }

      return res.status(200).json({ success: true })
    }

    // Method not allowed
    res.setHeader("Allow", ["GET", "POST"])
    return res.status(405).json({ error: "Method not allowed" })
  } catch (err) {
    console.error("Unexpected error:", err)
    return res.status(500).json({ error: "Unexpected server error" })
  }
}
