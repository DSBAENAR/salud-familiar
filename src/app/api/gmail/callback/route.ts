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

    return NextResponse.redirect(new URL("/correos?connected=true", request.url));
  } catch (error) {
    console.error("[Gmail Callback]", error);
    return NextResponse.redirect(new URL("/correos?error=auth_failed", request.url));
  }
}
