import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { coffee, dietary, breakfast, activities, other } = body;

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2C2C2C;">
        <div style="border-bottom: 2px solid #B8965A; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 300; color: #2C2C2C; margin: 0;">Savannah Trip — Guest Preferences</h1>
          <p style="font-size: 14px; color: #5C6B5E; margin: 8px 0 0;">Vienna &amp; Dylan's responses</p>
        </div>

        ${coffee ? `
        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin: 0 0 4px;">Coffee</p>
          <p style="font-size: 16px; color: #2C2C2C; margin: 0;">${escapeHtml(coffee)}</p>
        </div>
        ` : ""}

        ${dietary ? `
        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin: 0 0 4px;">Dietary Restrictions / Allergies</p>
          <p style="font-size: 16px; color: #2C2C2C; margin: 0;">${escapeHtml(dietary)}</p>
        </div>
        ` : ""}

        ${breakfast ? `
        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin: 0 0 4px;">Breakfast Preferences</p>
          <p style="font-size: 16px; color: #2C2C2C; margin: 0;">${escapeHtml(breakfast)}</p>
        </div>
        ` : ""}

        ${activities ? `
        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin: 0 0 4px;">Activities Interested In</p>
          <p style="font-size: 16px; color: #2C2C2C; margin: 0;">${escapeHtml(activities)}</p>
        </div>
        ` : ""}

        ${other ? `
        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin: 0 0 4px;">Anything Else</p>
          <p style="font-size: 16px; color: #2C2C2C; margin: 0; white-space: pre-wrap;">${escapeHtml(other)}</p>
        </div>
        ` : ""}

        <div style="border-top: 1px solid #E8E4DD; padding-top: 16px; margin-top: 32px;">
          <p style="font-size: 12px; color: #8A7E72; margin: 0;">Submitted from the Savannah Trip Guide at sweeney.family</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "Savannah Guide <noreply@ourfable.ai>",
      to: "davesweeney2.8@gmail.com",
      subject: "Savannah Trip — Vienna & Dylan's Preferences",
      html: htmlBody,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send guest preferences email:", error);
    return NextResponse.json(
      { error: "Failed to send preferences" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
