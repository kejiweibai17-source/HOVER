import { NextRequest, NextResponse } from "next/server";
import { colorizeSvgMarkup } from "@/lib/svgLogo";

function getAllowedHost(): string | null {
  const base = process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "";
  if (!base) return null;
  try {
    return new URL(base).host;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  const color = req.nextUrl.searchParams.get("color") || "#ffffff";

  if (!urlParam) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "invalid protocol" }, { status: 400 });
  }

  const allowedHost = getAllowedHost();
  if (allowedHost && target.host !== allowedHost) {
    return NextResponse.json({ error: "forbidden host" }, { status: 403 });
  }

  try {
    const res = await fetch(target.toString(), {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`upstream ${res.status}`);
    }

    const svg = await res.text();
    if (!/<svg[\s>]/i.test(svg)) {
      throw new Error("not svg");
    }

    const colored = colorizeSvgMarkup(svg, color);

    return new NextResponse(colored, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("[api/footer/svg]", error);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
