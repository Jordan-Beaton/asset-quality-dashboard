import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";

const MASTER_ADMIN_EMAIL = "jbeaton@enshoresubsea.com";
const MASTER_ADMIN_NAME = "Jordan Beaton";

type AdminAction =
  | "inviteUser"
  | "resetPassword"
  | "updatePersonAccess"
  | "updateCompany"
  | "updateRole"
  | "addDepartment"
  | "updateDepartment"
  | "addProject"
  | "updateProject"
  | "addAuditLog";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service configuration is missing.");
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return data.user;
}

async function ensureAdminAccess() {
  const user = await getCurrentUser();
  if (!user?.email) return { user: null, error: "Authentication required.", status: 401 };

  const service = getServiceClient();
  const email = user.email.toLowerCase();

  if (email === MASTER_ADMIN_EMAIL) {
    return { user, service, error: null, status: 200 };
  }

  const { data: person, error } = await service
    .from("people")
    .select("id,name,email,role,system_role,is_master_admin,active,access_status")
    .or(`email.ilike.${user.email},name.ilike.${MASTER_ADMIN_NAME}`)
    .limit(5);

  if (error) {
    return { user, service, error: error.message, status: 500 };
  }

  const matchedPerson = (person || []).find((row) => {
    const rowEmail = cleanText(row.email).toLowerCase();
    return rowEmail === email || (email === MASTER_ADMIN_EMAIL && cleanText(row.name).toLowerCase() === MASTER_ADMIN_NAME.toLowerCase());
  });

  if (matchedPerson?.active === false || cleanText(matchedPerson?.access_status).toLowerCase() === "deactivated") {
    return { user, service, error: "Admin account is deactivated.", status: 403 };
  }

  const adminRole = cleanText(matchedPerson?.system_role) || cleanText(matchedPerson?.role);
  if (matchedPerson?.is_master_admin || adminRole === "Admin") {
    return { user, service, error: null, status: 200 };
  }

  return { user, service, error: "Admin access required.", status: 403 };
}

async function writeAuditLog(
  service: any,
  actorEmail: string,
  actionType: string,
  targetType: string,
  targetReference: string,
  summary: string,
  previousValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
) {
  const auditPayload = {
    actor_email: actorEmail,
    actor_name: actorEmail.toLowerCase() === MASTER_ADMIN_EMAIL ? MASTER_ADMIN_NAME : null,
    action_type: actionType,
    target_type: targetType,
    target_reference: targetReference,
    summary,
    previous_values: previousValues || null,
    new_values: newValues || null,
  };

  const { error } = await service.from("ims_audit_log").insert(auditPayload);
  if (!error) return;

  await service.from("ims_audit_log").insert({
    actor_email: auditPayload.actor_email,
    actor_name: auditPayload.actor_name,
    action_type: auditPayload.action_type,
    target_type: auditPayload.target_type,
    target_reference: auditPayload.target_reference,
    summary: auditPayload.summary,
  });
}

export async function GET() {
  try {
    const access = await ensureAdminAccess();
    if (access.error || !access.service || !access.user) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const service = access.service as any;
    const [authUsersResult, peopleResult, companyResult, departmentsResult, projectsResult, rolesResult, auditLogResult] =
      await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("people").select("*").order("name", { ascending: true }),
        service.from("ims_company_settings").select("*").limit(1).maybeSingle(),
        service.from("ims_reference_departments").select("*").order("name", { ascending: true }),
        service.from("ims_reference_projects").select("*").order("name", { ascending: true }),
        service.from("ims_roles").select("*").order("role_name", { ascending: true }),
        service.from("ims_audit_log").select("*").order("created_at", { ascending: false }).limit(80),
      ]);

    if (peopleResult.error) throw peopleResult.error;

    const authUsers = authUsersResult.data.users.map((user: any) => ({
      id: user.id,
      email: user.email || "",
      last_sign_in_at: user.last_sign_in_at || null,
      created_at: user.created_at || null,
      banned_until: user.banned_until || null,
      confirmed_at: user.confirmed_at || null,
    }));

    return NextResponse.json({
      currentUserEmail: access.user.email,
      people: peopleResult.data || [],
      authUsers,
      company: companyResult.data || null,
      departments: departmentsResult.data || [],
      projects: projectsResult.data || [],
      roles: rolesResult.data || [],
      auditLog: auditLogResult.data || [],
      warnings: [
        companyResult.error ? `Company settings: ${companyResult.error.message}` : "",
        departmentsResult.error ? `Departments: ${departmentsResult.error.message}` : "",
        projectsResult.error ? `Projects: ${projectsResult.error.message}` : "",
        rolesResult.error ? `Roles: ${rolesResult.error.message}` : "",
        auditLogResult.error ? `Audit log: ${auditLogResult.error.message}` : "",
      ].filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin settings load failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await ensureAdminAccess();
    if (access.error || !access.service || !access.user?.email) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json()) as { action?: AdminAction; payload?: Record<string, unknown> };
    const action = body.action;
    const payload = body.payload || {};
    const service = access.service as any;
    const actorEmail = access.user.email;

    if (action === "inviteUser") {
      const email = cleanText(payload.email).toLowerCase();
      const name = cleanText(payload.name);
      const role = cleanText(payload.system_role) || "Viewer";
      const department = cleanText(payload.department);

      if (!email || !name) {
        return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
      }

      const inviteResult = await service.auth.admin.inviteUserByEmail(email, {
        data: { name, system_role: role, department },
      });

      if (inviteResult.error) {
        return NextResponse.json({ error: inviteResult.error.message }, { status: 400 });
      }

      const personPayload = {
        name,
        email,
        role: cleanText(payload.job_role),
        department: department || null,
        system_role: role,
        access_status: "Invited",
        active: true,
        is_master_admin: email === MASTER_ADMIN_EMAIL,
      };

      const { data: existingPeople, error: existingPeopleError } = await service
        .from("people")
        .select("id,email")
        .ilike("email", email)
        .limit(1);

      if (existingPeopleError) {
        return NextResponse.json({ error: existingPeopleError.message }, { status: 400 });
      }

      const peopleResult = existingPeople?.[0]?.id
        ? await service.from("people").update(personPayload).eq("id", existingPeople[0].id)
        : await service.from("people").insert(personPayload);

      if (peopleResult.error) {
        return NextResponse.json({ error: peopleResult.error.message }, { status: 400 });
      }

      await writeAuditLog(service, actorEmail, "Invite User", "Person", email, `Invited ${name} as ${role}.`);
      return NextResponse.json({ ok: true });
    }

    if (action === "resetPassword") {
      const email = cleanText(payload.email).toLowerCase();
      if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

      const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
      const resetResult = await (service.auth as any).resetPasswordForEmail(email, {
        redirectTo: origin ? `${origin}/login` : undefined,
      });

      if (resetResult?.error) {
        return NextResponse.json({ error: resetResult.error.message }, { status: 400 });
      }

      await writeAuditLog(service, actorEmail, "Reset Password", "Person", email, `Password reset requested for ${email}.`);
      return NextResponse.json({ ok: true });
    }

    if (action === "updatePersonAccess") {
      const id = cleanText(payload.id);
      const email = cleanText(payload.email).toLowerCase();
      const systemRole = cleanText(payload.system_role) || "Viewer";
      const accessStatus = cleanText(payload.access_status) || "Active";
      const department = cleanText(payload.department);
      const permissionsNotes = cleanText(payload.permissions_notes);
      const permissionOverride = cleanText(payload.permission_override) || "Role Default";
      const isMasterAdmin = email === MASTER_ADMIN_EMAIL || Boolean(payload.is_master_admin);
      const active = accessStatus !== "Deactivated";
      const moduleAccessPayload = {
        quality_access: cleanText(payload.quality_access) || null,
        hse_access: cleanText(payload.hse_access) || null,
        asset_access: cleanText(payload.asset_access) || null,
        risk_access: cleanText(payload.risk_access) || null,
        document_access: cleanText(payload.document_access) || null,
        action_access: cleanText(payload.action_access) || null,
        admin_access: cleanText(payload.admin_access) || null,
      };

      if (!id) return NextResponse.json({ error: "Person id is required." }, { status: 400 });
      if (email === MASTER_ADMIN_EMAIL && accessStatus === "Deactivated") {
        return NextResponse.json({ error: "The master admin account cannot be deactivated." }, { status: 400 });
      }

      const { data: previousPerson, error: previousPersonError } = await service
        .from("people")
        .select("id,name,email,department,system_role,access_status,active,is_master_admin,permission_override,quality_access,hse_access,asset_access,risk_access,document_access,action_access,admin_access")
        .eq("id", id)
        .maybeSingle();

      if (previousPersonError) {
        return NextResponse.json({ error: previousPersonError.message }, { status: 400 });
      }

      const nextPersonValues = {
        system_role: email === MASTER_ADMIN_EMAIL ? "Admin" : systemRole,
        access_status: email === MASTER_ADMIN_EMAIL ? "Active" : accessStatus,
        department: department || null,
        permissions_notes: permissionsNotes || null,
        permission_override: email === MASTER_ADMIN_EMAIL ? "Full System Access" : permissionOverride,
        ...(email === MASTER_ADMIN_EMAIL
          ? {
              quality_access: "Full",
              hse_access: "Full",
              asset_access: "Full",
              risk_access: "Full",
              document_access: "Full",
              action_access: "Full",
              admin_access: "Full",
            }
          : moduleAccessPayload),
        is_master_admin: isMasterAdmin,
        active,
      };

      const { error: updateError } = await service
        .from("people")
        .update(nextPersonValues)
        .eq("id", id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      const authUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUser = authUsers.data.users.find((user: any) => (user.email || "").toLowerCase() === email);
      if (authUser?.id && email !== MASTER_ADMIN_EMAIL) {
        await (service.auth.admin as any).updateUserById(authUser.id, {
          ban_duration: active ? "none" : "876000h",
          user_metadata: { system_role: systemRole, department },
        });
      }

      await writeAuditLog(
        service,
        actorEmail,
        "Update Access",
        "Person",
        email,
        `${email} set to ${systemRole} / ${accessStatus}.`,
        previousPerson || null,
        { id, email, ...nextPersonValues },
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "updateCompany") {
      const id = cleanText(payload.id);
      const updatePayload = {
        company_name: cleanText(payload.company_name) || "Enshore Subsea",
        trading_name: cleanText(payload.trading_name) || null,
        address: cleanText(payload.address) || null,
        primary_contact_name: cleanText(payload.primary_contact_name) || null,
        primary_contact_email: cleanText(payload.primary_contact_email) || null,
        primary_brand_colour: cleanText(payload.primary_brand_colour) || "#3A9B98",
        financial_year_start_month: Number(payload.financial_year_start_month) || 1,
        updated_at: new Date().toISOString(),
      };

      const result = id
        ? await service.from("ims_company_settings").update(updatePayload).eq("id", id)
        : await service.from("ims_company_settings").insert(updatePayload);

      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
      }

      await writeAuditLog(service, actorEmail, "Update Company Settings", "Company", updatePayload.company_name, "Company profile updated.");
      return NextResponse.json({ ok: true });
    }

    if (action === "updateRole") {
      const id = cleanText(payload.id);
      if (!id) return NextResponse.json({ error: "Role id is required." }, { status: 400 });

      const rolePayload = {
        quality_access: cleanText(payload.quality_access) || "None",
        hse_access: cleanText(payload.hse_access) || "None",
        asset_access: cleanText(payload.asset_access) || "None",
        risk_access: cleanText(payload.risk_access) || "None",
        document_access: cleanText(payload.document_access) || "Role Default",
        action_access: cleanText(payload.action_access) || "None",
        admin_access: cleanText(payload.admin_access) || "None",
        description: cleanText(payload.description) || null,
      };

      const { data: previousRole, error: previousRoleError } = await service
        .from("ims_roles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (previousRoleError) return NextResponse.json({ error: previousRoleError.message }, { status: 400 });

      const { error } = await service.from("ims_roles").update(rolePayload).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      await writeAuditLog(
        service,
        actorEmail,
        "Update Role Permissions",
        "Role",
        cleanText(payload.role_name),
        `${cleanText(payload.role_name)} permissions updated.`,
        previousRole || null,
        { id, role_name: cleanText(payload.role_name), ...rolePayload },
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "addDepartment" || action === "addProject") {
      const table = action === "addDepartment" ? "ims_reference_departments" : "ims_reference_projects";
      const name = cleanText(payload.name);
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

      const insertPayload =
        action === "addDepartment"
          ? { name, code: cleanText(payload.code) || null, active: true }
          : { name, type: cleanText(payload.type) || "Project", active: true };

      const { error } = await service.from(table).insert(insertPayload);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      await writeAuditLog(service, actorEmail, action, table, name, `${name} added.`);
      return NextResponse.json({ ok: true });
    }

    if (action === "updateDepartment" || action === "updateProject") {
      const table = action === "updateDepartment" ? "ims_reference_departments" : "ims_reference_projects";
      const id = cleanText(payload.id);
      if (!id) return NextResponse.json({ error: "Reference id is required." }, { status: 400 });

      const updatePayload =
        action === "updateDepartment"
          ? { name: cleanText(payload.name), code: cleanText(payload.code) || null, active: Boolean(payload.active) }
          : { name: cleanText(payload.name), type: cleanText(payload.type) || "Project", active: Boolean(payload.active) };

      const { error } = await service.from(table).update(updatePayload).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      await writeAuditLog(service, actorEmail, action, table, cleanText(payload.name), `${cleanText(payload.name)} updated.`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin settings update failed." },
      { status: 500 },
    );
  }
}
