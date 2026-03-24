"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    visible: false,
    type: "info",
    message: "",
  });

  function showToast({ type = "info", message = "" }) {
    setToast({
      visible: true,
      type,
      message,
    });
  }

  function hideToast() {
    setToast({
      visible: false,
      type: "info",
      message: "",
    });
  }

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
