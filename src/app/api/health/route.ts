import { NextResponse } from "next/server";

import { getEnvPresence } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "settlehq",
    checkedAt: new Date().toISOString(),
    env: getEnvPresence(),
  });
}
