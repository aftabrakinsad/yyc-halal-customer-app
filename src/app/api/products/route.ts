import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth-helpers";
import { handle } from "@/lib/http";
import { catalog } from "@/lib/content";

export const GET = handle(async () => {
  await apiUser();
  return NextResponse.json(await catalog());
});
