"use client";

import { useCallback, useEffect } from "react";
import Script from "next/script";
import { userApi } from "@/lib/api/user";

const ONE_SIGNAL_SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

export default function UserPushRegistration() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const PUSH_RESET_KEY = "__onesignal_reset_done__";

  const isOneSignalStoreError = (message) =>
    message.includes("'Ids' is not a known object store name") ||
    message.includes("'Options' is not a known object store name");

  const clearOneSignalIndexedDb = useCallback(async () => {
    if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") return;

    const dbs = await indexedDB.databases();
    const oneSignalDbNames = (dbs || [])
      .map((db) => db?.name)
      .filter((name) => typeof name === "string" && /onesignal/i.test(name));

    await Promise.all(
      oneSignalDbNames.map(
        (dbName) =>
          new Promise((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          })
      )
    );
  }, []);

  const clearOneSignalStorage = useCallback(() => {
    try {
      for (const key of Object.keys(localStorage || {})) {
        if (/onesignal/i.test(key)) localStorage.removeItem(key);
      }
    } catch {}

    try {
      for (const key of Object.keys(sessionStorage || {})) {
        if (/onesignal/i.test(key)) sessionStorage.removeItem(key);
      }
    } catch {}
  }, []);

  const resetOneSignalState = useCallback(async () => {
    await clearOneSignalIndexedDb();
    clearOneSignalStorage();
  }, [clearOneSignalIndexedDb, clearOneSignalStorage]);

  useEffect(() => {
    if (typeof window === "undefined" || !appId) return;
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "::1";
    const canUsePush = window.isSecureContext || isLocal;
    if (!canUsePush) return;

    let active = true;
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const profile = await userApi.getProfile();
        const residentId = profile?.id;
        if (!active || !residentId) return;

      
        try {
          const workerUrl = `${window.location.origin}/OneSignalSDKWorker.js`;
          const updaterUrl = `${window.location.origin}/OneSignalSDKUpdaterWorker.js`;
          const [workerResp, updaterResp] = await Promise.all([
            fetch(workerUrl, { cache: "no-store" }),
            fetch(updaterUrl, { cache: "no-store" }),
          ]);
          if (!workerResp.ok || !updaterResp.ok) {
            throw new Error(
              `Worker fetch failed: worker=${workerResp.status}, updater=${updaterResp.status}`
            );
          }
        } catch {}

        if (navigator.serviceWorker?.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || "";
            if (scriptUrl.includes("/http://") || scriptUrl.includes("/https://")) {
              await reg.unregister();
            }
          }
        }

        try {
          await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "OneSignalSDKWorker.js",
            serviceWorkerUpdaterPath: "OneSignalSDKUpdaterWorker.js",
            serviceWorkerParam: { scope: "/" },
          });
        } catch (error) {
          const message = error?.message || "";
          const isIdStoreError = isOneSignalStoreError(message);

          if (isIdStoreError) {
            await resetOneSignalState();
            try {
              await OneSignal.init({
                appId,
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerPath: "OneSignalSDKWorker.js",
                serviceWorkerUpdaterPath: "OneSignalSDKUpdaterWorker.js",
                serviceWorkerParam: { scope: "/" },
              });
            } catch (retryError) {
              const retryMessage = retryError?.message || "";
              if (!retryMessage.toLowerCase().includes("already initialized")) {
                throw retryError;
              }
            }
          } else if (!message.toLowerCase().includes("already initialized")) {
            throw error;
          }
        }

        try {
          await OneSignal.login(String(residentId));
        } catch (error) {
          const message = error?.message || "";
          if (!isOneSignalStoreError(message)) {
            throw error;
          }

          await resetOneSignalState();

          const alreadyReset = sessionStorage.getItem(PUSH_RESET_KEY) === "1";
          if (!alreadyReset) {
            sessionStorage.setItem(PUSH_RESET_KEY, "1");
            window.location.reload();
            return;
          }

          throw error;
        }

        sessionStorage.removeItem(PUSH_RESET_KEY);
        if (typeof OneSignal.User?.addAlias === "function") {
          await OneSignal.User.addAlias("resident_id", String(residentId));
        }

        const requestPermissionAndOptIn = async () => {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "default" &&
            OneSignal.Notifications &&
            typeof OneSignal.Notifications.requestPermission === "function"
          ) {
            try {
              await OneSignal.Notifications.requestPermission();
            } catch {}
          }

          if (
            OneSignal.User?.PushSubscription &&
            typeof OneSignal.User.PushSubscription.optIn === "function"
          ) {
            try {
              await OneSignal.User.PushSubscription.optIn();
            } catch {}
          }
        };

        // Browser permission prompt usually requires user activation.
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          const runOnGesture = async () => {
            await requestPermissionAndOptIn();
            window.removeEventListener("click", runOnGesture);
          };
          window.addEventListener("click", runOnGesture, { once: true });
        } else {
          await requestPermissionAndOptIn();
        }
      } catch (error) {
        // Silent by design: push init should never block user pages.
      }
    });

    return () => {
      active = false;
    };
  }, [appId, resetOneSignalState]);

  if (!appId) return null;

  return <Script src={ONE_SIGNAL_SDK_URL} strategy="afterInteractive" />;
}
