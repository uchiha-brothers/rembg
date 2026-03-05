import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req,res){

  if(req.method==="GET"){
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at",{ascending:false})

    if(error) return res.status(500).json({error:error.message})
    return res.json(data)
  }

  if(req.method==="POST"){
    const { title, url } = req.body
    if(!title || !url) return res.status(400).json({error:"Missing data"})

    // Check duplicate
    const { data:existing } = await supabase
      .from("videos")
      .select("*")
      .eq("title", title)

    if(existing.length) return res.status(400).json({error:"Title exists"})

    const { error } = await supabase
      .from("videos")
      .insert({ title, url })

    if(error) return res.status(500).json({error:error.message})

    res.json({success:true})
  }
}
