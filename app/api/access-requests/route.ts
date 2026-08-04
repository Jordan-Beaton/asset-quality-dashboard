import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { IMS_PERMISSION_REGISTRY } from "../../../src/lib/imsPermissionRegistry";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Access request service is not configured.");
  return createClient(url, key);
}

function clean(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function GET() {
  try {
    const service = serviceClient();
    const { data, error } = await service.from("ims_reference_departments").select("name").eq("active", true).order("name");
    if (error) throw error;
    return NextResponse.json({ departments: (data || []).map((row) => row.name), modules: IMS_PERMISSION_REGISTRY.filter((module) => module.moduleKey !== "admin").map((module) => ({ key: module.moduleKey, label: module.label })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access request options could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const firstName = clean(body.first_name, 80); const lastName = clean(body.last_name, 80); const email = clean(body.email, 160).toLowerCase(); const department = clean(body.department, 120); const reason = clean(body.reason, 1500);
    const allowedModules = new Set(IMS_PERMISSION_REGISTRY.filter((module) => module.moduleKey !== "admin").map((module) => module.moduleKey));
    const requestedModules = Array.isArray(body.requested_modules) ? [...new Set(body.requested_modules.map((value) => clean(value, 80)).filter((value) => allowedModules.has(value)))] : [];
    if (!firstName || !lastName || !email || !department || !reason || !requestedModules.length) return NextResponse.json({ error: "Complete every field and select at least one module." }, { status: 400 });
    if (!/^[^\s@]+@enshoresubsea\.com$/i.test(email)) return NextResponse.json({ error: "Use your @enshoresubsea.com email address." }, { status: 400 });
    const service = serviceClient();
    const { data: validDepartment } = await service.from("ims_reference_departments").select("name").eq("active", true).ilike("name", department).maybeSingle();
    if (!validDepartment) return NextResponse.json({ error: "Select a valid active department." }, { status: 400 });
    const { data: existing } = await service.from("ims_access_requests").select("id").ilike("email", email).eq("status", "Pending").maybeSingle();
    if (existing) return NextResponse.json({ error: "A pending request already exists for this email address." }, { status: 409 });
    const { error } = await service.from("ims_access_requests").insert({ first_name: firstName, last_name: lastName, email, department: validDepartment.name, reason, requested_modules: requestedModules });
    if (error) throw error;
    return NextResponse.json({ ok: true, message: "Access request submitted. An IMS Admin will review it." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access request could not be submitted." }, { status: 500 });
  }
}
