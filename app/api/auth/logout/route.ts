import { NextResponse } from "next/server";
import { TOKEN_COOKIE_NAME } from "@/lib/auth";
import { successResponse } from "@/lib/api-helpers";

export async function POST() {
  const response = successResponse(null, "Logged out successfully");
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
