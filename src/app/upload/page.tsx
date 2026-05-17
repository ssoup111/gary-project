"use client";

import { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleUpload() {
    if (!file) {
      setStatus("Please choose a photo first.");
      return;
    }

    setStatus("Uploading...");

    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "-")
      .replace(/-+/g, "-");

    const fileName = `${Date.now()}-${safeName}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from("gary-photos")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      setStatus(`Upload failed: ${error.message}`);
      return;
    }

    setStatus("Photo uploaded successfully!");
    setFile(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

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
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "48px 24px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#6b7280", fontWeight: 700 }}>
              Gary&apos;s Picture Project
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: "42px" }}>
              Upload a Photo
            </h1>
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
              href="/gallery"
              style={{
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#111827",
                color: "white",
                fontWeight: 700,
              }}
            >
              View Gallery
            </a>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "22px",
              padding: "28px",
              boxShadow: "0 14px 38px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
              Add a new image
            </h2>
            <p style={{ color: "#4b5563", lineHeight: 1.7 }}>
              Upload family pictures, meaningful moments, and memory-keeping
              images for the project gallery.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null;
                setFile(selectedFile);

                if (selectedFile) {
                  const objectUrl = URL.createObjectURL(selectedFile);
                  setPreviewUrl(objectUrl);
                  setStatus(`Selected: ${selectedFile.name}`);
                }
              }}
            />

            <div
              style={{
                marginTop: "24px",
                border: "2px dashed #d1d5db",
                borderRadius: "18px",
                padding: "26px",
                background: "#f9fafb",
              }}
            >
              <button
                type="button"
                onClick={openFilePicker}
                style={{
                  padding: "14px 22px",
                  fontSize: "17px",
                  cursor: "pointer",
                  borderRadius: "10px",
                  border: "none",
                  background: "#374151",
                  color: "white",
                  fontWeight: 700,
                  marginRight: "12px",
                }}
              >
                Choose Photo
              </button>

              <button
                type="button"
                onClick={handleUpload}
                style={{
                  padding: "14px 22px",
                  fontSize: "17px",
                  cursor: "pointer",
                  borderRadius: "10px",
                  border: "none",
                  background: "#111827",
                  color: "white",
                  fontWeight: 700,
                }}
              >
                Upload Photo
              </button>

              <p style={{ marginTop: "18px", color: "#6b7280" }}>
                Best for photos and memory images you want displayed in the
                gallery.
              </p>
            </div>

            {status && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  borderRadius: "14px",
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  fontWeight: 700,
                  color: "#312e81",
                }}
              >
                {status}
              </div>
            )}
          </div>

          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "22px",
              padding: "28px",
              boxShadow: "0 14px 38px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Preview</h2>
            <p style={{ color: "#4b5563", lineHeight: 1.7 }}>
              You&apos;ll see your selected image here before uploading.
            </p>

            <div
              style={{
                marginTop: "20px",
                minHeight: "380px",
                borderRadius: "20px",
                overflow: "hidden",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "500px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "#6b7280",
                    lineHeight: 1.8,
                  }}
                >
                  <strong>No photo selected yet.</strong>
                  <br />
                  Click <em>Choose Photo</em> to preview an image here.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}