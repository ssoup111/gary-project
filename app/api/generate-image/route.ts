import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { prompt, categoryId } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    const safePrompt = `
Create an appropriate, non-explicit, adult-only image for the Friends Behind Bars catalog.

Hard rules:
- No children
- No minors
- No school-age subjects
- No nudity
- No sexual content
- No violence
- No illegal activity

User prompt:
${prompt}
    `;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: safePrompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    });

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image returned from OpenAI." },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");
    const fileName = `generated/${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("jpix-generated")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("jpix-generated")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabaseAdmin
      .from("generated_images")
      .insert({
        category_id: categoryId || null,
        prompt,
        image_url: imageUrl,
        status: "pending_review",
      });

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Generate image error:", error);

    return NextResponse.json(
      { success: false, error: "Image generation failed." },
      { status: 500 }
    );
  }
}
