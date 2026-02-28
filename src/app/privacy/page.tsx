export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 640, margin: "60px auto", padding: "0 24px", fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Last updated: February 28, 2026</p>

      <p>This application is a private, personal dashboard used solely by Dave Sweeney. It is not available to the public.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>Data Collection</h2>
      <p>This app may connect to third-party services (including WHOOP) to display personal health and fitness data. All data is stored privately and is accessible only to the account owner.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>Data Use</h2>
      <p>Data collected from connected services is used exclusively to display information within this private dashboard. It is never sold, shared, or used for advertising.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>Contact</h2>
      <p>Questions: <a href="mailto:davesweeney2.8@gmail.com" style={{ color: "#2A4E8A" }}>davesweeney2.8@gmail.com</a></p>
    </div>
  );
}
