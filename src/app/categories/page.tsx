import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: category } = await supabase
    .from("categories")
    .select("name, description")
    .eq("id", id)
    .single();

  const { data: images } = await supabase
    .from("images")
    .select("id, title, description, image_url")
    .eq("category_id", id)
    .eq("is_active", true);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <Link href="/categories">← Back to Categories</Link>

      <h1 style={{ marginTop: "20px" }}>{category?.name}</h1>
      <p>{category?.description}</p>

      <div style={{ marginTop: "30px" }}>
        <h2>Pictures</h2>

        {images?.length === 0 && <p>No pictures yet.</p>}

        {images?.map((image) => (
          <div
            key={image.id}
            style={{
              border: "1px solid #ddd",
              padding: "12px",
              marginTop: "15px",
            }}
          >
            <img
              src={image.image_url}
              alt={image.title}
              style={{ maxWidth: "300px", width: "100%" }}
            />
            <h3>{image.title}</h3>
            <p>{image.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}