export default function Navbar() {
  return (
    <nav
      style={{
        background: "#111827",
        color: "white",
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h2 style={{ margin: 0 }}>Gary Project</h2>

      <div style={{ display: "flex", gap: "20px" }}>
        <a href="/" style={{ color: "white", textDecoration: "none" }}>
          Home
        </a>
        <a href="/features" style={{ color: "white", textDecoration: "none" }}>
          Features
        </a>
        <a href="/contact" style={{ color: "white", textDecoration: "none" }}>
          Contact
        </a>
      </div>
    </nav>
  );
}