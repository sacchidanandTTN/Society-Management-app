"use client";

import { useCallback, useEffect, useState } from "react";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { userApi } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/error";
import { useToast } from "@/providers/ToastProvider";

export default function UserNotificationsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await userApi.listNotifications({ page: 1, limit: 100 });
      setItems(data.items || []);
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = async (id) => {
    try {
      await userApi.markNotificationRead(id);
      showToast({ type: "success", message: "Notification marked as read." });
      await loadNotifications();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 lg:hidden">
            {items.length ? (
              items.map((item) => (
                <div key={item.user_notification_id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 break-words text-sm text-slate-700">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-600">Read: {item.is_read ? "Yes" : "No"}</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={item.is_read}
                      onClick={() => markRead(item.user_notification_id)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-xs disabled:opacity-50"
                    >
                      Mark Read
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No notifications found.
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Read</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item) => (
                    <tr key={item.user_notification_id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium">{item.title}</td>
                      <td className="px-4 py-3">{item.message}</td>
                      <td className="px-4 py-3">{item.is_read ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={item.is_read}
                          onClick={() => markRead(item.user_notification_id)}
                          className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-50"
                        >
                          Mark Read
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No notifications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
