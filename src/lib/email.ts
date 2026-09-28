import "server-only";
import nodemailer from "nodemailer";

let transport: nodemailer.Transporter | null = null;

export type Mail = { to: string; subject: string; html: string; text: string };

/** Sends an email via SMTP_URL. Without SMTP configured (development) the email is logged instead. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.info(`[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return true;
  }
  transport ??= nodemailer.createTransport(url);
  try {
    await transport.sendMail({ from: process.env.EMAIL_FROM, ...mail });
    return true;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}
