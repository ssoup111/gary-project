import { createClient } from "@supabase/supabase-js";

type PhotoRecord = {
  id: string;
  title: string | null;
  description: string | null;
  storage_path: string;
  created_at: string;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { success: false, error: "Missing Supabase environment variables." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("photos")
      .select("id, title, description, storage_path, created_at")
      .eq("id", id)
      .single();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    const photo = data as PhotoRecord;

    const { data: signedData, error: signedError } = await supabase.storage
      .from("gary-photos")
      .createSignedUrl(photo.storage_path, 60 * 60);

    if (signedError) {
      return Response.json(
        { success: false, error: signedError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      photo: {
        id: photo.id,
        title: photo.title || "Untitled photo",
        description: photo.description || "",
        url: signedData.signedUrl,
        created_at: photo.created_at,
      },
    });
  } catch (error) {
    console.error("Photo API error:", error);

    return Response.json(
      { success: false, error: "Photo API failed." },
      { status: 500 }
    );
  }
}