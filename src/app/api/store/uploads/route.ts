import { NextResponse } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { apiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/http";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 15 * 1024 * 1024;

/** Product photos and flyers. Re-encoded to WebP (max 1600px) which strips metadata and rejects non-images. */
export const POST = handle(async (req: Request) => {
  const staff = await apiUser();
  if (!can(staff.role, "manageProducts") && !can(staff.role, "manageFlyers")) throw new HttpError(403, "You don't have permission to upload images.");
  rateLimit(`upload:${staff.id}`, 30, 60_000);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "That image is too large (max 15 MB).");
  let out: { data: Buffer; info: OutputInfo };
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 80_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new HttpError(400, "We couldn't read that image. Try a JPG, PNG or WebP file.");
  }
  const upload = await db.upload.create({
    data: { mimeType: "image/webp", data: new Uint8Array(out.data), width: out.info.width, height: out.info.height, createdById: staff.id },
    select: { id: true, width: true, height: true },
  });
  return NextResponse.json({ url: `/api/uploads/${upload.id}`, ...upload }, { status: 201 });
});
