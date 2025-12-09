import Link from "next/link";

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1e293b 0, #020617 45%, #000 100%)",
        color: "#f9fafb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "32px 16px 40px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
          About Gold Rush
        </h1>
        <p style={{ fontSize: 14, marginBottom: 24 }}>
          Simple about page. If you can see this, routing is working.
        </p>
        <Link
          href="/"
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(129,140,248,0.7)",
            background: "rgba(30,64,175,0.7)",
            color: "#e5e7eb",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          ← Back to lobby
        </Link>
      </div>
    </main>
  );
}
