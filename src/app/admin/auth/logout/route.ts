import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "@/lib/env";
import { isSameOrigin } from "@/lib/security/request";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (isSameOrigin(request)) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/admin/login", siteUrl), { status: 303 });
}
