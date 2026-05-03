export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f7f8fb 0%, #ffffff 42%, #f3f4f7 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "72px 24px 42px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: "32px",
            alignItems: "center",
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
                fontWeight: 800,
                color: "#374151",
              }}
            >
              Preserve pictures. Share stories. Keep memories alive.
            </p>

            <h1
              style={{
                fontSize: "58px",
                lineHeight: 1.04,
                margin: "22px 0 18px",
                fontWeight: 900,
                letterSpacing: "-1.4px",
              }}
            >
              Gary&apos;s Picture Project
            </h1>

            <p
              style={{
                fontSize: "20px",
                lineHeight: 1.75,
                color: "#4b5563",
                maxWidth: "720px",
                margin: "0 0 32px",
              }}
            >
              A clean and simple place to upload photos, build a gallery,
              preserve family memories, and share meaningful moments with
              others.
            </p>

            <div
              style={{
                display: "flex",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <a href="/upload" style={primaryButton}>
                Upload Photos
              </a>

              <a href="/gallery" style={secondaryButton}>
                View Gallery
              </a>

              <a href="/contact" style={lightButton}>
                Contact Us
              </a>
            </div>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "26px",
              padding: "28px",
              boxShadow: "0 18px 50px rgba(0,0,0,0.09)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                borderRadius: "22px",
                background:
                  "linear-gradient(135deg, #111827 0%, #374151 55%, #6b7280 100%)",
                minHeight: "330px",
                padding: "28px",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#d1d5db",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                  }}
                >
                  MEMORY ARCHIVE
                </p>

                <h2
                  style={{
                    margin: "14px 0 10px",
                    fontSize: "34px",
                    lineHeight: 1.12,
                  }}
                >
                  Photos with purpose.
                </h2>

                <p style={{ color: "#e5e7eb", lineHeight: 1.7 }}>
                  Upload images, organize the collection, and make the project
                  easy for family and friends to browse.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                  marginTop: "24px",
                }}
              >
                <MiniStat number="01" label="Upload" />
                <MiniStat number="02" label="Gallery" />
                <MiniStat number="03" label="Stories" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "18px 24px 36px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
          }}
        >
          <FeatureCard
            title="Upload Photos"
            text="Add meaningful pictures quickly to the project collection."
            bg="#eef2ff"
          />
          <FeatureCard
            title="View Gallery"
            text="Browse uploaded images in a clean, organized photo grid."
            bg="#ecfeff"
          />
          <FeatureCard
            title="Preserve Memories"
            text="Keep important moments together in one place for the future."
            bg="#fef3c7"
          />
          <FeatureCard
            title="Send Inquiries"
            text="Use the contact form for questions, support, and project ideas."
            bg="#fce7f3"
          />
        </div>
      </section>

      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "20px 24px 80px",
        }}
      >
        <div
          style={{
            background: "#111827",
            color: "white",
            borderRadius: "26px",
            padding: "34px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "22px",
            alignItems: "center",
            boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 10px", fontSize: "30px" }}>
              Start building the collection
            </h2>
            <p style={{ margin: 0, color: "#d1d5db", lineHeight: 1.7 }}>
              Use the upload page to add photos and the gallery page to see the
              collection displayed.
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
                fontWeight: 800,
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
                border: "1px solid rgba(255,255,255,0.28)",
                fontWeight: 800,
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

function MiniStat({ number, label }: { number: string; label: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.13)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      <p style={{ margin: "0 0 6px", fontWeight: 900, fontSize: "20px" }}>
        {number}
      </p>
      <p style={{ margin: 0, color: "#e5e7eb", fontWeight: 700 }}>{label}</p>
    </div>
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
        borderRadius: "22px",
        padding: "24px",
        minHeight: "150px",
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 10px 26px rgba(0,0,0,0.05)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "21px" }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.65 }}>{text}</p>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  textDecoration: "none",
  background: "#111827",
  color: "white",
  padding: "15px 24px",
  borderRadius: "12px",
  fontWeight: 800,
  fontSize: "16px",
};

const secondaryButton: React.CSSProperties = {
  textDecoration: "none",
  background: "white",
  color: "#111827",
  padding: "15px 24px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  fontWeight: 800,
  fontSize: "16px",
};

const lightButton: React.CSSProperties = {
  textDecoration: "none",
  background: "#f3f4f6",
  color: "#111827",
  padding: "15px 24px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  fontWeight: 800,
  fontSize: "16px",
};