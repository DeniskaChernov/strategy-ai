import React, { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        padding: "10px 16px",
        background: "rgba(245,158,11,.95)",
        color: "#1a1204",
        fontSize: 13,
        fontWeight: 700,
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,.25)",
      }}
    >
      Нет подключения к сети. Часть функций может быть недоступна.
    </div>
  );
}
