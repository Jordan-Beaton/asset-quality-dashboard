"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ImsPermissionValue = {
  loaded: boolean;
  moduleKey: string | null;
  areaKey: string | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  fullAccess: boolean;
  isMasterAdmin: boolean;
};

const defaultPermissionValue: ImsPermissionValue = {
  loaded: false,
  moduleKey: null,
  areaKey: null,
  canView: false,
  canCreate: false,
  canEdit: false,
  fullAccess: false,
  isMasterAdmin: false,
};

const ImsPermissionContext = createContext<ImsPermissionValue>(defaultPermissionValue);

export function ImsPermissionProvider({
  value,
  children,
}: {
  value: ImsPermissionValue;
  children: ReactNode;
}) {
  return <ImsPermissionContext.Provider value={value}>{children}</ImsPermissionContext.Provider>;
}

export function useImsPermissions() {
  return useContext(ImsPermissionContext);
}

export function ImsPermissionNotice() {
  const permission = useImsPermissions();
  if (!permission.loaded || permission.isMasterAdmin || permission.fullAccess || (!permission.canView && !permission.moduleKey)) return null;
  if (permission.canCreate && permission.canEdit) return null;

  const restriction = permission.canView
    ? permission.canCreate
      ? "Create access enabled. Editing existing records is restricted."
      : permission.canEdit
        ? "Edit access enabled. Creating new records is restricted."
        : "Read-only access. Create, edit, upload, approval, and delete actions are restricted."
    : "This area is restricted.";

  return (
    <div
      style={{
        margin: "0 0 14px",
        border: "1px solid #bfdbfe",
        borderRadius: 14,
        background: "#eff6ff",
        color: "#1e3a8a",
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {restriction}
    </div>
  );
}

