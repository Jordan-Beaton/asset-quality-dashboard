import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "./supabase/server";

// Server-side check that the signed-in person is an IMS admin (same rule as the Admin console).
const MASTER_ADMIN_EMAIL = "jbeaton@enshoresubsea.com";

const clean = (value: unknown) => String(value ?? "").trim();

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function getSignedInEmail() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return clean(data.user?.email).toLowerCase() || null;
}

export async function requireAdmin(): Promise<{ email: string | null; error: string | null; status: number }> {
  const email = await getSignedInEmail();
  if (!email) return { email: null, error: "Authentication required.", status: 401 };
  if (email === MASTER_ADMIN_EMAIL) return { email, error: null, status: 200 };

  const service = getServiceClient();
  const { data, error } = await service
    .from("people")
    .select("email,role,system_role,is_master_admin,active,access_status")
    .ilike("email", email)
    .limit(1);
  if (error) return { email, error: error.message, status: 500 };
  const person = (data || [])[0];
  if (!person) return { email, error: "Admin access required.", status: 403 };
  if (person.active === false || clean(person.access_status).toLowerCase() === "deactivated") return { email, error: "Admin account is deactivated.", status: 403 };
  const role = clean(person.system_role) || clean(person.role);
  if (person.is_master_admin || role === "Admin") return { email, error: null, status: 200 };
  return { email, error: "Admin access required.", status: 403 };
}
