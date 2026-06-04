"use client";

import { useEffect, useRef } from "react";

type ToastType = "success" | "error";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onDismiss: () => void;
}

export default function Toast({ message, type = "success", onDismiss }: ToastProps) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; });

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDismissRef.current(), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-white shadow-xl text-sm transition-opacity ${
      type === "success" ? "bg-green-600" : "bg-red-600"
    }`}>
      <span>{type === "success" ? "✓" : "✗"}</span>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}
