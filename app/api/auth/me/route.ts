import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return errorResponse("Not authenticated", "UNAUTHORIZED", 401);
  }
  return successResponse({ user });
}
