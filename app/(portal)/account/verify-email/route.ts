import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/lib/auth/email-tokens";

export const runtime = "nodejs";

/** Link from the confirmation email. Works signed in or not: the token proves ownership. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const confirmed = await confirmEmailToken(url.searchParams.get("token") ?? "");
  return NextResponse.redirect(new URL(`/account?email=${confirmed ? "verified" : "invalid"}`, url.origin));
}
