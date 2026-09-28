import { NextResponse } from "next/server";
import sharp from "sharp";
import { apiUser, avatarUrl } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, HttpError } from "@/lib/http";

const MAX_BYTES = 8 * 1024 * 1024;

// Upload / replace the profile picture. The image is re-encoded server-side (strips metadata
// such as GPS location, and rejects anything that isn't really an image).
export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a photo to upload.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "That photo is too large (max 8 MB).");
  if (!file.type.startsWith("image/")) throw new HttpError(400, "Please upload an image file.");

  let data: Buffer;
  try {
    data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(320, 320, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(400, "We couldn't read that image. Try a JPG or PNG photo.");
  }
  const updated = await db.user.update({
    where: { id: user.id },
    data: { avatarData: new Uint8Array(data), avatarUpdatedAt: new Date() },
    select: { id: true, avatarUpdatedAt: true, googleImageUrl: true },
  });
  await audit({ actorId: user.id, actorRole: user.role, ip: clientIp(req), action: "PROFILE_PHOTO_UPDATED", entityType: "User", entityId: user.id });
  return NextResponse.json({ imageUrl: avatarUrl(updated) });
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser();
  const updated = await db.user.update({
    where: { id: user.id },
    data: { avatarData: null, avatarUpdatedAt: null },
    select: { id: true, avatarUpdatedAt: true, googleImageUrl: true },
  });
  await audit({ actorId: user.id, actorRole: user.role, ip: clientIp(req), action: "PROFILE_PHOTO_REMOVED", entityType: "User", entityId: user.id });
  return NextResponse.json({ imageUrl: avatarUrl(updated) });
});
