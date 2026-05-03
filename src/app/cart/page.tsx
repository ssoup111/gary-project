export default function Home() {
  return (
    <main style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Gary Project</h1>
      <p>Application is now live and running.</p>

      <h2>Status</h2>
      <p>Initial development environment successfully configured.</p>

      <button onClick={() => alert("Gary Project Running")}>
        Test Button
      </button>
    </main>
  );
}