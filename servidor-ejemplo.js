// Ejemplo Cloudflare Worker. Configurar secreto GEMINI_API_KEY en el Worker, nunca en HTML.
// Desplegar como endpoint HTTPS; configurar CORS para el dominio autorizado en producción.
export default { async fetch(request, env) {
  const headers={"Access-Control-Allow-Origin":env.ALLOWED_ORIGIN||"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};
  if(request.method==="OPTIONS")return new Response(null,{headers});
  if(request.method!=="POST")return new Response(JSON.stringify({error:"Use POST"}),{status:405,headers});
  try {
    const form=await request.formData(),file=form.get("image");
    if(!(file instanceof File)||!file.type.startsWith("image/")||file.size>4_000_000)return new Response(JSON.stringify({error:"Imagen inválida o mayor a 4 MB"}),{status:400,headers});
    const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:"Extraé solamente códigos SAP y números de parte visibles en esta fotografía de etiqueta industrial. No inventes ni completes caracteres ilegibles. Devolvé exclusivamente JSON válido con formato {\"codes\":[\"...\"]}. Si no se leen códigos, devuelve {\"codes\":[]}."},{inline_data:{mime_type:file.type,data:btoa(binary)}}]}],generationConfig:{responseMimeType:"application/json",temperature:0}})});
    if(!response.ok)return new Response(JSON.stringify({error:"Servicio de IA no disponible"}),{status:502,headers});
    const data=await response.json();const raw=data.candidates?.[0]?.content?.parts?.[0]?.text||"{}";const parsed=JSON.parse(raw);return new Response(JSON.stringify({codes:Array.isArray(parsed.codes)?parsed.codes.filter(x=>typeof x==="string").slice(0,12):[]}),{headers});
  }catch(e){return new Response(JSON.stringify({error:"No se pudo procesar la imagen"}),{status:500,headers})}
}};
