import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { success: false, error: "Missing Supabase environment variables." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.storage
      .from("gary-photos")
      .list("uploads", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const imageFiles =
      data?.filter((file) => {
        const name = file.name.toLowerCase();

        return (
          name.endsWith(".jpg") ||
          name.endsWith(".jpeg") ||
          name.endsWith(".png") ||
          name.endsWith(".webp") ||
          name.endsWith(".gif")
        );
      }) || [];

    const photos = await Promise.all(
      imageFiles.map(async (file) => {
        const filePath = `uploads/${file.name}`;

        const { data: signedData, error: signedError } =
          await supabase.storage
            .from("gary-photos")
            .createSignedUrl(filePath, 60 * 60);

        if (signedError) {
          return null;
        }

        return {
          name: file.name,
          url: signedData.signedUrl,
        };
      })
    );

    return Response.json({
      success: true,
      photos: photos.filter(Boolean),
    });
  } catch (error) {
    console.error("Gallery API error:", error);

    return Response.json(
      { success: false, error: "Gallery API failed." },
      { status: 500 }
    );
  }
}