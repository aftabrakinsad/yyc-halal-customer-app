import { apiUser, isStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// Profile pictures are visible to their owner and to store staff only.
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const viewer = await apiUser();
  const { id } = await ctx.params;
  if (viewer.id !== id && !isStaff(viewer.role)) throw new HttpError(404, "Not found");
  const user = await db.user.findUnique({ where: { id }, select: { avatarData: true } });
  if (!user?.avatarData) throw new HttpError(404, "Not found");
  return new Response(Buffer.from(user.avatarData), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=31536000, immutable" },
  });
});
