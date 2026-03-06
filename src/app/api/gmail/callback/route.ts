import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client, saveTokens } from "@/lib/gmail/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    await saveTokens(tokens);

    const base = request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : request.nextUrl.origin;
    return NextResponse.redirect(new URL("/correos?connected=true", base));
  } catch (error) {
    console.error("[Gmail Callback]", error);
    const base = request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : request.nextUrl.origin;
    return NextResponse.redirect(new URL("/correos?error=auth_failed", base));
  }
}
