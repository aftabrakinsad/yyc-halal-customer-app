import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// Public catalog images (products, flyers). Ids are unguessable and content never changes.
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upload = await db.upload.findUnique({ where: { id }, select: { data: true, mimeType: true } });
  if (!upload) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(upload.data), {
    headers: { "Content-Type": upload.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
