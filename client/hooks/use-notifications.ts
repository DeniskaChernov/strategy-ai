import { useCallback, useEffect, useState } from "react";
import { API_BASE, apiFetch } from "../api";

export function useNotifications(open: boolean, userEmail?: string) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!API_BASE || !userEmail) return;
    setNotifLoading(true);
    try {
      const d = await apiFetch("/api/notifications");
      setNotifs(d.notifications || []);
      setNotifUnread(typeof d.unread === "number" ? d.unread : 0);
    } catch {
      setNotifs([]);
    } finally {
      setNotifLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail || !API_BASE) return;
    loadNotifications();
  }, [userEmail, loadNotifications]);

  useEffect(() => {
    if (open && userEmail && API_BASE) loadNotifications();
  }, [open, userEmail, loadNotifications]);

  return { notifs, setNotifs, notifUnread, setNotifUnread, notifLoading, loadNotifications };
}
