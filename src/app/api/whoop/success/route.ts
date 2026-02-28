import { NextResponse } from "next/server";

/**
 * GET /api/whoop/success
 * Shown after a successful WHOOP OAuth connection.
 * Redirects to the dashboard after a short delay.
 */
export async function GET() {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="3;url=/" />
  <title>WHOOP Connected</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #060606;
      color: #E8E4DF;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      text-align: center;
      padding: 2rem 3rem;
      border: 1px solid #1A1816;
      border-radius: 1rem;
    }
    .score { font-size: 3rem; }
    h1 { color: #B8956A; margin: 0.5rem 0; }
    p  { color: #6B6560; margin: 0.25rem 0; }
    a  { color: #B8956A; }
  </style>
</head>
<body>
  <div class="card">
    <div class="score">✅</div>
    <h1>WHOOP Connected</h1>
    <p>Your data is syncing. Redirecting to dashboard…</p>
    <p><a href="/">Go now →</a></p>
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
