"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const url = "/sw.js";
    navigator.serviceWorker.register(url).catch((err) => {
      console.warn("SW register failed", err);
    });
  }, []);

  return null;
}
