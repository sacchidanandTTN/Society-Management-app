"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";

const ROLE_CACHE_KEY = "__role_guard_roles__";

function normalizeRole(data) {
  const roles = data?.roles;
  if (!Array.isArray(roles)) return [];
  return roles;
}

export default function RoleGuard({ allowedRole, children }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const readCachedRoles = () => {
    try {
      if (typeof window === "undefined") return [];
      const raw = sessionStorage.getItem(ROLE_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCachedRoles = (roles) => {
    try {
      if (typeof window === "undefined") return;
      sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(roles || []));
    } catch {}
  };

  const goToUnauthorized = useCallback(() => {
    const from = encodeURIComponent(pathname || "/");
    window.location.assign(`/?authError=unauthorized&from=${from}`);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    const normalizedAllowedRole = typeof allowedRole === "string" ? allowedRole.toLowerCase() : "";
    setErrorMessage("");

    const cachedRoles = readCachedRoles();
    if (cachedRoles.includes(normalizedAllowedRole)) {
      setAllowed(true);
    } else {
      setAllowed(false);
    }

    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const verifyRole = async () => {
      try {
        let response = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          response = await axios.get("/api/auth/me", {
            withCredentials: true,
            validateStatus: () => true,
          });
          if (response.status < 500) break;
          if (attempt === 0) await pause(300);
        }

        if (!response || response.status < 200 || response.status >= 300) {
          throw { response: { status: response?.status || 500 } };
        }

        const payload = response.data;
        const normalizedRoles = normalizeRole(payload?.data);

        if (!active) return;

        writeCachedRoles(normalizedRoles);
        if (!normalizedRoles.length) {
          goToUnauthorized();
          return;
        }

        if (normalizedRoles.includes(normalizedAllowedRole)) {
          setAllowed(true);
          return;
        }

        goToUnauthorized();
      } catch (error) {
        if (!active) return;
        const status = error?.response?.status;
        if (status === 401) {
          const returnTo = encodeURIComponent(pathname || "/");
          window.location.assign(`/api/auth/login?returnTo=${returnTo}&forceLogin=true`);
          return;
        }

        if (cachedRoles.includes(normalizedAllowedRole)) {
          setAllowed(true);
          return;
        }

        if (status >= 500) {
          setErrorMessage("Session check failed.");
          return;
        }
        goToUnauthorized();
      }
    };

    void verifyRole();
    return () => {
      active = false;
    };
  }, [allowedRole, goToUnauthorized, pathname]);

  if (!allowed) {
    if (errorMessage) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Validating access...
      </div>
    );
  }

  return children;
}
