"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type NotificationRow = {
  id: string;
  source_module: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

const POLL_INTERVAL_MS = 60000;

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotificationBell({ email }: { email: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!email) return;
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase
        .from("ims_notifications")
        .select("id,source_module,title,body,link,created_at,read_at")
        .ilike("recipient_email", email.trim())
        .order("created_at", { ascending: false })
        .limit(30);

      if (!isMounted || error) return;
      setNotifications((data || []) as NotificationRow[]);
      setLoaded(true);
    }

    void load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [email]);

  const unread = notifications.filter((notification) => !notification.read_at);

  async function markAllRead() {
    if (!unread.length) return;
    const ids = unread.map((notification) => notification.id);
    const now = new Date().toISOString();
    setNotifications((current) => current.map((notification) => (ids.includes(notification.id) ? { ...notification, read_at: now } : notification)));
    await supabase.from("ims_notifications").update({ read_at: now }).in("id", ids);
  }

  async function openNotification(notification: NotificationRow) {
    setOpen(false);
    if (!notification.read_at) {
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: now } : item)));
      await supabase.from("ims_notifications").update({ read_at: now }).eq("id", notification.id);
    }
    if (notification.link) router.push(notification.link);
  }

  if (!email) return null;

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Notifications" title="Notifications" style={bellButtonStyle}>
        <svg viewBox="0 0 24 24" style={bellIconStyle} aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread.length > 0 ? <span style={badgeStyle}>{unread.length > 9 ? "9+" : unread.length}</span> : null}
      </button>

      {open ? (
        <>
          <div style={backdropStyle} onClick={() => setOpen(false)} aria-hidden="true" />
          <div style={panelStyle} role="dialog" aria-label="Notifications">
            <div style={panelHeadStyle}>
              <span style={panelTitleStyle}>Notifications</span>
              {unread.length > 0 ? (
                <button type="button" onClick={markAllRead} style={markAllStyle}>
                  Mark all as read
                </button>
              ) : null}
            </div>
            <div style={panelListStyle}>
              {!loaded ? (
                <div style={emptyStyle}>Loading&hellip;</div>
              ) : notifications.length === 0 ? (
                <div style={emptyStyle}>You&rsquo;re all caught up &mdash; nothing new to review.</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    style={{ ...itemStyle, background: notification.read_at ? "transparent" : "#ECECE7" }}
                  >
                    <span style={notification.read_at ? dotSpacerStyle : dotStyle} aria-hidden="true" />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={itemTopStyle}>
                        <span style={itemTitleStyle}>{notification.title}</span>
                        <span style={itemTimeStyle}>{formatRelativeTime(notification.created_at)}</span>
                      </div>
                      {notification.body ? <div style={itemBodyStyle}>{notification.body}</div> : null}
                      <span style={itemTagStyle}>{notification.source_module}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const bellButtonStyle: CSSProperties = {
  position: "relative",
  width: "38px",
  height: "38px",
  borderRadius: "8px",
  border: "1px solid #D0D0CE",
  background: "#ffffff",
  color: "#005670",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const bellIconStyle: CSSProperties = {
  width: "18px",
  height: "18px",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: "-6px",
  right: "-6px",
  minWidth: "17px",
  height: "17px",
  padding: "0 4px",
  borderRadius: "999px",
  background: "#F93822",
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #ffffff",
  boxSizing: "border-box",
};

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  width: "392px",
  maxWidth: "calc(100vw - 40px)",
  background: "#ffffff",
  border: "1px solid #D0D0CE",
  borderRadius: "14px",
  boxShadow: "0 20px 44px rgba(15, 23, 42, 0.16)",
  overflow: "hidden",
  zIndex: 1001,
};

const panelHeadStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderBottom: "1px solid #D0D0CE",
};

const panelTitleStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: "14px",
  color: "#000000",
};

const markAllStyle: CSSProperties = {
  color: "#005670",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  background: "none",
  border: "none",
  padding: 0,
  fontFamily: "inherit",
};

const panelListStyle: CSSProperties = {
  maxHeight: "420px",
  overflowY: "auto",
  padding: "6px",
};

const emptyStyle: CSSProperties = {
  padding: "34px 16px",
  textAlign: "center",
  color: "#53565A",
  fontSize: "13px",
};

const itemStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  width: "100%",
  textAlign: "left",
  padding: "11px 10px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

const dotStyle: CSSProperties = {
  flexShrink: 0,
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#005670",
  marginTop: "6px",
};

const dotSpacerStyle: CSSProperties = {
  flexShrink: 0,
  width: "6px",
  height: "6px",
  marginTop: "6px",
};

const itemTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "baseline",
};

const itemTitleStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#000000",
  lineHeight: 1.35,
};

const itemTimeStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: "11px",
  color: "#53565A",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};

const itemBodyStyle: CSSProperties = {
  fontSize: "12.5px",
  color: "#53565A",
  marginTop: "2px",
  lineHeight: 1.4,
};

const itemTagStyle: CSSProperties = {
  display: "inline-block",
  marginTop: "6px",
  fontSize: "9.5px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#53565A",
};
