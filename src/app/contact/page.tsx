export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f7f8fb 0%, #ffffff 35%, #f3f4f7 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
          padding: "80px 24px 40px",
        }}
      >
        <div>
          <p
            style={{
              display: "inline-block",
              margin: 0,
              padding: "8px 14px",
              borderRadius: "999px",
              background: "#e5e7eb",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Preserve pictures. Share stories. Keep memories alive.
          </p>

          <h1
            style={{
              fontSize: "56px",
              lineHeight: 1.05,
              margin: "22px 0 18px",
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            Gary&apos;s Picture Project
          </h1>

          <p
            style={{
              fontSize: "20px",
              lineHeight: 1.7,
              color: "#4b5563",
              maxWidth: "720px",
              marginBottom: "32px",
            }}
          >
            A simple place to upload photos, build a gallery, preserve family
            memories, and share meaningful moments with others.
          </p>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "40px",
            }}
          >
            <a
              href="/upload"
              style={{
                textDecoration: "none",
                background: "#111827",
                color: "white",
                padding: "15px 24px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              Upload Photos
            </a>

            <a
              href="/gallery"
              style={{
                textDecoration: "none",
                background: "white",
                color: "#111827",
                padding: "15px 24px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              View Gallery
            </a>

            <a
              href="/contact"
              style={{
                textDecoration: "none",
                background: "#f3f4f6",
                color: "#111827",
                padding: "15px 24px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              Contact Us
            </a>
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 15px 45px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
            marginTop: "30px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <FeatureCard
              title="Upload Photos"
              text="Add pictures quickly and safely to your growing collection."
              bg="#eef2ff"
            />
            <FeatureCard
              title="Build a Gallery"
              text="Display photos in a clean, simple, easy-to-browse layout."
              bg="#ecfeff"
            />
            <FeatureCard
              title="Preserve Memories"
              text="Keep important moments together in one place for the future."
              bg="#fef3c7"
            />
            <FeatureCard
              title="Share Stories"
              text="Connect photos with meaning, history, and personal stories."
              bg="#fce7f3"
            />
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
          padding: "20px 24px 80px",
        }}
      >
        <div
          style={{
            background: "#111827",
            color: "white",
            borderRadius: "24px",
            padding: "34px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 10px", fontSize: "30px" }}>
              Start building the collection
            </h2>
            <p style={{ margin: 0, color: "#d1d5db", lineHeight: 1.7 }}>
              Use the upload page to add photos and the gallery page to see them
              displayed beautifully.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="/upload"
              style={{
                textDecoration: "none",
                background: "white",
                color: "#111827",
                padding: "14px 22px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              Go to Upload
            </a>

            <a
              href="/gallery"
              style={{
                textDecoration: "none",
                background: "transparent",
                color: "white",
                padding: "14px 22px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.25)",
                fontWeight: 700,
              }}
            >
              Go to Gallery
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  text,
  bg,
}: {
  title: string;
  text: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: "18px",
        padding: "22px",
        minHeight: "140px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "10px" }}>{title}</h3>
      <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}