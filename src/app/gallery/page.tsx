"use client";

import { useEffect, useState } from "react";

type Photo = {
  name: string;
  url: string;
};

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState("Loading photos...");

  useEffect(() => {
    async function loadPhotos() {
      try {
        const response = await fetch(`/api/gallery?time=${Date.now()}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!result.success) {
          setStatus(`Could not load photos: ${result.error}`);
          return;
        }

        if (!result.photos || result.photos.length === 0) {
          setStatus("No photos yet uploaded.");
          return;
        }

        setPhotos(result.photos);
        setStatus("");
      } catch (error) {
        console.error("Gallery page error:", error);
        setStatus("Could not load photos.");
      }
    }

    loadPhotos();
  }, []);

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
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "48px 24px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#6b7280", fontWeight: 700 }}>
              Gary&apos;s Picture Project
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: "42px" }}>Gallery</h1>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href="/"
              style={{
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: "10px",
                background: "white",
                color: "#111827",
                border: "1px solid #d1d5db",
                fontWeight: 700,
              }}
            >
              Home
            </a>
            <a
              href="/upload"
              style={{
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#111827",
                color: "white",
                fontWeight: 700,
              }}
            >
              Upload More Photos
            </a>
            <a
              href="/contact"
              style={{
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#f3f4f6",
                color: "#111827",
                border: "1px solid #e5e7eb",
                fontWeight: 700,
              }}
            >
              Contact
            </a>
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "22px 24px",
            marginBottom: "26px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.7 }}>
            Browse uploaded images from Gary&apos;s Picture Project. This page
            shows the current photo collection stored in Supabase.
          </p>
        </div>

        {status && (
          <div
            style={{
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              color: "#312e81",
              borderRadius: "16px",
              padding: "16px 18px",
              fontWeight: 700,
              marginBottom: "24px",
            }}
          >
            {status}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "22px",
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo.name}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 14px 34px rgba(0,0,0,0.07)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "250px",
                  overflow: "hidden",
                  background: "#f3f4f6",
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>

              <div style={{ padding: "16px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    color: "#374151",
                  }}
                >
                  {photo.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}