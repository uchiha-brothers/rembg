import { createClient } from "@supabase/supabase-js"
import formidable from "formidable"
import fs from "fs"
import FormData from "form-data"

export const config = {
  api: { bodyParser: false }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req,res){

if(req.method==="GET"){

const { data } = await supabase
.from("videos")
.select("*")
.order("created_at",{ascending:false})

return res.json(data)

}

if(req.method==="POST"){

const form = formidable()

form.parse(req, async (err,fields,files)=>{

const title = fields.title
const file = files.video

if(!title || !file){
return res.status(400).json({error:"Missing data"})
}

const { data:existing } = await supabase
.from("videos")
.select("*")
.eq("title",title)

if(existing.length){
return res.status(400).json({error:"Title exists"})
}

const formData = new FormData()

formData.append("reqtype","fileupload")
formData.append("fileToUpload",fs.createReadStream(file.filepath))

const upload = await fetch("https://catbox.moe/user/api.php",{
method:"POST",
body:formData
})

const url = (await upload.text()).trim()

await supabase.from("videos").insert({
title:title,
url:url
})

res.json({success:true,url})

})

}

}
