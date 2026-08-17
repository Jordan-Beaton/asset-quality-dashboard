import { NextResponse } from "next/server";
import { createClient as createServiceClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";

const MASTER_ADMIN_EMAIL = "jbeaton@enshoresubsea.com";
const MASTER_ADMIN_NAME = "Jordan Beaton";

type AdminAction =
  | "inviteUser"
  | "sendExistingInvite"
  | "generateSetupLink"
  | "resetPassword"
  | "updatePersonAccess"
  | "updateTabPermissions"
  | "updateCompany"
  | "updateRole"
  | "addDepartment"
  | "updateDepartment"
  | "addProject"
  | "updateProject"
  | "addAuditLog"
  | "reviewAccessRequest";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service configuration is missing.");
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

type ServiceClient = SupabaseClient;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanBoolean(value: unknown) {
  return value === true;
}

function getInviteOrigin(request: Request) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (configuredSiteUrl) return configuredSiteUrl;
  if (vercelUrl) return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  return request.headers.get("origin") || "";
}

function getGeneratedLink(data: unknown) {
  const result = data as {
    action_link?: string;
    properties?: {
      action_link?: string;
      email_otp?: string;
      hashed_token?: string;
      redirect_to?: string;
    };
  };
  return cleanText(result?.properties?.action_link) || cleanText(result?.action_link);
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
  service: ServiceClient,
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

    const service = access.service;
    const [authUsersResult, peopleResult, companyResult, departmentsResult, projectsResult, rolesResult, auditLogResult, tabPermissionsResult, accessRequestsResult] =
      await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("people").select("*").order("name", { ascending: true }),
        service.from("ims_company_settings").select("*").limit(1).maybeSingle(),
        service.from("ims_reference_departments").select("*").order("name", { ascending: true }),
        service.from("ims_reference_projects").select("*").order("name", { ascending: true }),
        service.from("ims_roles").select("*").order("role_name", { ascending: true }),
        service.from("ims_audit_log").select("*").order("created_at", { ascending: false }).limit(80),
        service.from("ims_tab_permissions").select("*").order("module_key", { ascending: true }).order("area_key", { ascending: true }),
        service.from("ims_access_requests").select("*").order("submitted_at", { ascending: false }).limit(500),
      ]);

    if (peopleResult.error) throw peopleResult.error;

    const authUsers = authUsersResult.data.users.map((user: User) => ({
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
      tabPermissions: tabPermissionsResult.data || [],
      accessRequests: accessRequestsResult.data || [],
      warnings: [
        companyResult.error ? `Company settings: ${companyResult.error.message}` : "",
        departmentsResult.error ? `Departments: ${departmentsResult.error.message}` : "",
        projectsResult.error ? `Projects: ${projectsResult.error.message}` : "",
        rolesResult.error ? `Roles: ${rolesResult.error.message}` : "",
        auditLogResult.error ? `Audit log: ${auditLogResult.error.message}` : "",
        tabPermissionsResult.error ? `Tab permissions: ${tabPermissionsResult.error.message}` : "",
        accessRequestsResult.error ? `Access requests: ${accessRequestsResult.error.message}` : "",
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
    const service = access.service;
    const actorEmail = access.user.email;

    if (action === "inviteUser") {
      const email = cleanText(payload.email).toLowerCase();
      const name = cleanText(payload.name);
      const role = cleanText(payload.system_role) || "Viewer";
      const department = cleanText(payload.department);
      const permissionOverride = cleanText(payload.permission_override) || "Role Default";
      const requestId = cleanText(payload.request_id);
      const moduleAccessPayload = {
        quality_access: cleanText(payload.quality_access) || null,
        hse_access: cleanText(payload.hse_access) || null,
        asset_access: cleanText(payload.asset_access) || null,
        risk_access: cleanText(payload.risk_access) || null,
        document_access: cleanText(payload.document_access) || null,
        action_access: cleanText(payload.action_access) || null,
        people_access: cleanText(payload.people_access) || null,
        management_review_access: cleanText(payload.management_review_access) || null,
        admin_access: cleanText(payload.admin_access) || null,
      };
      const tabPermissions = Array.isArray(payload.tab_permissions) ? payload.tab_permissions : [];

      if (!email || !name) {
        return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
      }

      const personPayload = {
        name,
        email,
        role: cleanText(payload.job_role),
        department: department || null,
        system_role: role,
        access_status: "Invited",
        permissions_notes: cleanText(payload.permissions_notes) || null,
        permission_override: email === MASTER_ADMIN_EMAIL ? "Full System Access" : permissionOverride,
        ...(email === MASTER_ADMIN_EMAIL
          ? {
              quality_access: "Full",
              hse_access: "Full",
              asset_access: "Full",
              risk_access: "Full",
              document_access: "Full",
              action_access: "Full",
              people_access: "Full",
              management_review_access: "Full",
              admin_access: "Full",
            }
          : moduleAccessPayload),
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

      let personId = cleanText(existingPeople?.[0]?.id);
      if (personId) {
        const updateResult = await service.from("people").update(personPayload).eq("id", personId);
        if (updateResult.error) {
          return NextResponse.json({ error: updateResult.error.message }, { status: 400 });
        }
      } else {
        const insertResult = await service.from("people").insert(personPayload).select("id").single();
        if (insertResult.error) {
          return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
        }
        personId = cleanText(insertResult.data?.id);
      }

      if (personId && tabPermissions.length > 0) {
        const deleteResult = await service.from("ims_tab_permissions").delete().eq("person_id", personId);
        if (deleteResult.error) {
          return NextResponse.json({ error: deleteResult.error.message }, { status: 400 });
        }

        const permissionRows = tabPermissions
          .map((permission) => {
            const row = permission as Record<string, unknown>;
            const moduleKey = cleanText(row.module_key);
            const areaKey = cleanText(row.area_key);
            if (!moduleKey || !areaKey) return null;
            return {
              person_id: personId,
              email,
              module_key: moduleKey,
              area_key: areaKey,
              can_view: cleanBoolean(row.can_view) || cleanBoolean(row.full_access),
              can_create: cleanBoolean(row.can_create) || cleanBoolean(row.full_access),
              can_edit: cleanBoolean(row.can_edit) || cleanBoolean(row.full_access),
              full_access: cleanBoolean(row.full_access),
              updated_at: new Date().toISOString(),
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (permissionRows.length > 0) {
          const insertPermissionResult = await service.from("ims_tab_permissions").insert(permissionRows);
          if (insertPermissionResult.error) {
            return NextResponse.json({ error: insertPermissionResult.error.message }, { status: 400 });
          }
        }
      }

      if (requestId) {
        await service.from("ims_access_requests").update({ status: "Approved", reviewed_at: new Date().toISOString(), reviewed_by: actorEmail, review_notes: "Approved through Users & Access." }).eq("id", requestId).eq("status", "Pending");
      }

      const origin = getInviteOrigin(request);
      const authUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUser = authUsers.data.users.find((user: User) => (user.email || "").toLowerCase() === email);
      const redirectTo = origin ? `${origin}/login?mode=invite` : undefined;
      const inviteResult = authUser
        ? await service.auth.resetPasswordForEmail(email, { redirectTo })
        : await service.auth.admin.inviteUserByEmail(email, {
            data: { name, system_role: role, department },
            redirectTo,
          });

      if (inviteResult.error) {
        await writeAuditLog(
          service,
          actorEmail,
          "Invite User Email Failed",
          "Person",
          email,
          `Created ${name} with permissions, but invite email failed: ${inviteResult.error.message}.`,
        );
        return NextResponse.json({
          ok: true,
          warning: inviteResult.error.message,
          message: `${name} was created with permissions, but the invite email failed: ${inviteResult.error.message}. Use Send Invite again later.`,
        });
      }

      await writeAuditLog(service, actorEmail, "Invite User", "Person", email, `Invited ${name} as ${role}.`);
      return NextResponse.json({ ok: true });
    }

    if (action === "reviewAccessRequest") {
      const id = cleanText(payload.id); const status = cleanText(payload.status); const notes = cleanText(payload.notes);
      if (!id || !["Rejected", "Cancelled"].includes(status)) return NextResponse.json({ error: "A valid request and review outcome are required." }, { status: 400 });
      const { data: previous, error: previousError } = await service.from("ims_access_requests").select("*").eq("id", id).maybeSingle();
      if (previousError || !previous) return NextResponse.json({ error: previousError?.message || "Access request was not found." }, { status: 404 });
      const { error } = await service.from("ims_access_requests").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: actorEmail, review_notes: notes || null }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      await writeAuditLog(service, actorEmail, `${status} Access Request`, "Access Request", previous.email, `${status} access request from ${previous.email}.`, previous, { ...previous, status, review_notes: notes || null });
      return NextResponse.json({ ok: true, message: `Access request ${status.toLowerCase()}.` });
    }

    if (action === "sendExistingInvite") {
      const id = cleanText(payload.id);
      if (!id) return NextResponse.json({ error: "Person id is required." }, { status: 400 });

      const { data: person, error: personError } = await service
        .from("people")
        .select("id,name,email,department,role,system_role,access_status,active")
        .eq("id", id)
        .maybeSingle();

      if (personError) return NextResponse.json({ error: personError.message }, { status: 400 });
      if (!person?.email) return NextResponse.json({ error: "This person does not have an email address." }, { status: 400 });
      if (person.active === false || cleanText(person.access_status).toLowerCase() === "deactivated") {
        return NextResponse.json({ error: "Deactivated people cannot be invited." }, { status: 400 });
      }

      const email = cleanText(person.email).toLowerCase();
      const name = cleanText(person.name);
      const department = cleanText(person.department);
      const role = cleanText(person.system_role) || "Viewer";
      const origin = getInviteOrigin(request);
      const redirectTo = origin ? `${origin}/login?mode=invite` : undefined;
      const authUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUser = authUsers.data.users.find((user: User) => (user.email || "").toLowerCase() === email);

      const inviteResult = authUser
        ? await service.auth.resetPasswordForEmail(email, { redirectTo })
        : await service.auth.admin.inviteUserByEmail(email, {
            data: { name, system_role: role, department },
            redirectTo,
          });

      if (inviteResult.error) {
        return NextResponse.json({ error: inviteResult.error.message }, { status: 400 });
      }

      const { error: updateError } = await service
        .from("people")
        .update({ access_status: "Invited", active: true })
        .eq("id", id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

      await writeAuditLog(
        service,
        actorEmail,
        authUser ? "Send Password Setup" : "Send Invite",
        "Person",
        email,
        authUser ? `Password setup link sent to ${name}.` : `Invite link sent to ${name}.`,
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "generateSetupLink") {
      const id = cleanText(payload.id);
      if (!id) return NextResponse.json({ error: "Person id is required." }, { status: 400 });

      const { data: person, error: personError } = await service
        .from("people")
        .select("id,name,email,department,role,system_role,access_status,active")
        .eq("id", id)
        .maybeSingle();

      if (personError) return NextResponse.json({ error: personError.message }, { status: 400 });
      if (!person?.email) return NextResponse.json({ error: "This person does not have an email address." }, { status: 400 });
      if (person.active === false || cleanText(person.access_status).toLowerCase() === "deactivated") {
        return NextResponse.json({ error: "Deactivated people cannot be given setup links." }, { status: 400 });
      }

      const email = cleanText(person.email).toLowerCase();
      const name = cleanText(person.name);
      const department = cleanText(person.department);
      const role = cleanText(person.system_role) || "Viewer";
      const origin = getInviteOrigin(request);
      const redirectTo = origin ? `${origin}/login?mode=invite` : undefined;
      const authUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUser = authUsers.data.users.find((user: User) => (user.email || "").toLowerCase() === email);

      const linkResult = authUser
        ? await service.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo },
          })
        : await service.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              data: { name, system_role: role, department },
              redirectTo,
            },
          });

      if (linkResult.error) {
        return NextResponse.json({ error: linkResult.error.message }, { status: 400 });
      }

      const setupLink = getGeneratedLink(linkResult.data);
      if (!setupLink) {
        return NextResponse.json({ error: "Supabase did not return a setup link." }, { status: 400 });
      }

      const { error: updateError } = await service
        .from("people")
        .update({ access_status: "Invited", active: true })
        .eq("id", id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

      await writeAuditLog(
        service,
        actorEmail,
        authUser ? "Copy Password Setup Link" : "Copy Invite Link",
        "Person",
        email,
        authUser ? `Password setup link generated for ${name}.` : `Invite setup link generated for ${name}.`,
      );
      return NextResponse.json({
        ok: true,
        setupLink,
        message: `Setup link generated for ${name}.`,
      });
    }

    if (action === "resetPassword") {
      const email = cleanText(payload.email).toLowerCase();
      if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

      const origin = getInviteOrigin(request);
      const resetResult = await service.auth.resetPasswordForEmail(email, {
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
        people_access: cleanText(payload.people_access) || null,
        management_review_access: cleanText(payload.management_review_access) || null,
        admin_access: cleanText(payload.admin_access) || null,
      };

      if (!id) return NextResponse.json({ error: "Person id is required." }, { status: 400 });
      if (email === MASTER_ADMIN_EMAIL && accessStatus === "Deactivated") {
        return NextResponse.json({ error: "The master admin account cannot be deactivated." }, { status: 400 });
      }

      const { data: previousPerson, error: previousPersonError } = await service
        .from("people")
        .select("*")
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
              people_access: "Full",
              management_review_access: "Full",
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
      const authUser = authUsers.data.users.find((user: User) => (user.email || "").toLowerCase() === email);
      if (authUser?.id && email !== MASTER_ADMIN_EMAIL) {
        await service.auth.admin.updateUserById(authUser.id, {
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

    if (action === "updateTabPermissions") {
      const personId = cleanText(payload.person_id);
      const email = cleanText(payload.email).toLowerCase();
      const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

      if (!personId || !email) {
        return NextResponse.json({ error: "Person id and email are required." }, { status: 400 });
      }

      const { data: previousPermissions } = await service
        .from("ims_tab_permissions")
        .select("*")
        .eq("person_id", personId);

      const { error: deleteError } = await service
        .from("ims_tab_permissions")
        .delete()
        .eq("person_id", personId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      const rows = permissions
        .map((item) => {
          const row = item as Record<string, unknown>;
          const moduleKey = cleanText(row.module_key);
          const areaKey = cleanText(row.area_key);
          if (!moduleKey || !areaKey) return null;
          return {
            person_id: personId,
            email,
            module_key: moduleKey,
            area_key: areaKey,
            can_view: cleanBoolean(row.can_view),
            can_create: cleanBoolean(row.can_create),
            can_edit: cleanBoolean(row.can_edit),
            full_access: cleanBoolean(row.full_access),
            updated_at: new Date().toISOString(),
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length) {
        const { error: insertError } = await service.from("ims_tab_permissions").insert(rows);
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 400 });
        }
      }

      await writeAuditLog(
        service,
        actorEmail,
        "Update Tab Permissions",
        "Person",
        email,
        `Updated tab-level permissions for ${email}.`,
        { permissions: previousPermissions || [] },
        { permissions: rows },
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
        primary_brand_colour: cleanText(payload.primary_brand_colour) || "#005670",
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
        people_access: cleanText(payload.people_access) || "None",
        management_review_access: cleanText(payload.management_review_access) || "None",
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

      const { error } = action === "addDepartment"
        ? await service.from("ims_reference_departments").insert({ name, code: cleanText(payload.code) || null, active: true })
        : await service.from("ims_reference_projects").insert({ name, code: cleanText(payload.code) || null, type: cleanText(payload.type) || "Project", active: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      await writeAuditLog(service, actorEmail, action, table, name, `${name} added.`);
      return NextResponse.json({ ok: true });
    }

    if (action === "updateDepartment" || action === "updateProject") {
      const table = action === "updateDepartment" ? "ims_reference_departments" : "ims_reference_projects";
      const id = cleanText(payload.id);
      if (!id) return NextResponse.json({ error: "Reference id is required." }, { status: 400 });

      const { error } = action === "updateDepartment"
        ? await service.from("ims_reference_departments").update({ name: cleanText(payload.name), code: cleanText(payload.code) || null, active: Boolean(payload.active) }).eq("id", id)
        : await service.from("ims_reference_projects").update({ name: cleanText(payload.name), code: cleanText(payload.code) || null, type: cleanText(payload.type) || "Project", active: Boolean(payload.active) }).eq("id", id);
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
