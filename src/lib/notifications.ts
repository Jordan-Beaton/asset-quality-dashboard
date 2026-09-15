import { createClient } from "@supabase/supabase-js";

export type NotificationInput = {
  recipientEmail: string;
  sourceModule: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Writes an in-app notification row alongside an existing email send. Never throws —
 * a logging failure here must not block the underlying email/action it accompanies.
 */
export async function writeNotification(input: NotificationInput): Promise<void> {
  return writeNotifications([input]);
}

export async function writeNotifications(inputs: NotificationInput[]): Promise<void> {
  try {
    const client = serviceClient();
    if (!client) return;

    const rows = inputs
      .filter((item) => item.recipientEmail && item.recipientEmail.includes("@") && item.title)
      .map((item) => ({
        recipient_email: item.recipientEmail.trim().toLowerCase(),
        source_module: item.sourceModule,
        title: item.title,
        body: item.body || null,
        link: item.link || null,
      }));

    if (!rows.length) return;

    await client.from("ims_notifications").insert(rows);
  } catch {
    // Notification logging is best-effort only.
  }
}
