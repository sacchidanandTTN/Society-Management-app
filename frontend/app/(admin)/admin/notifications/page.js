"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import Modal from "@/components/ui/Modal";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { notificationFormSchema } from "@/lib/validation/adminForms";
import { useToast } from "@/providers/ToastProvider";

export default function AdminNotificationsPage() {
  const { showToast } = useToast();
  const [notificationsState, setNotificationsState] = useState({
    status: "idle",
    items: [],
    error: null,
  });
  const [open, setOpen] = useState(false);
  const [flats, setFlats] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState("__all__");
  const [targetsLoading, setTargetsLoading] = useState(false);

  const form = useSimpleForm({
    schema: notificationFormSchema,
    defaultValues: {
      title: "",
      message: "",
    },
  });

  const loadNotifications = useCallback(async () => {
    setNotificationsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await adminApi.listNotifications();
      setNotificationsState({
        status: "succeeded",
        items: data.items || [],
        error: null,
      });
    } catch (error) {
      setNotificationsState({
        status: "failed",
        items: [],
        error: getApiErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const loadTargetOptions = useCallback(async () => {
    setTargetsLoading(true);
    try {
      const flatData = await adminApi.listFlats({ page: 1, limit: 100 });
      setFlats(flatData?.items || []);
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    } finally {
      setTargetsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!open) return;
    void loadTargetOptions();
  }, [open, loadTargetOptions]);

  const resetComposer = useCallback(() => {
    form.reset({ title: "", message: "" });
    setSelectedTarget("__all__");
  }, [form]);

  const activeAllocatedFlats = useMemo(
    () => flats.filter((flat) => flat.is_active && flat.allocated_resident_id),
    [flats]
  );

  const selectedFlatMappedResidentIds = useMemo(() => {
    if (!selectedTarget || selectedTarget === "__all__") return [];
    const selectedFlat = activeAllocatedFlats.find((flat) => flat.id === selectedTarget);
    if (!selectedFlat?.allocated_resident_id) return [];
    return [selectedFlat.allocated_resident_id];
  }, [activeAllocatedFlats, selectedTarget]);

  const allActiveFlatMappedResidentIds = useMemo(() => {
    const residentIdSet = new Set();
    for (const flat of activeAllocatedFlats) {
      if (flat.allocated_resident_id && typeof flat.allocated_resident_id === "string") {
        residentIdSet.add(flat.allocated_resident_id);
      }
    }
    return [...residentIdSet];
  }, [activeAllocatedFlats]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let resident_ids = [];

      if (selectedTarget === "__all__") {
        if (!allActiveFlatMappedResidentIds.length) {
          showToast({
            type: "error",
            message: "No active flats with current resident allocation found.",
          });
          return;
        }
        resident_ids = allActiveFlatMappedResidentIds;
      } else {
        if (!selectedTarget) {
          showToast({
            type: "error",
            message: "Select a flat.",
          });
          return;
        }
        if (!selectedFlatMappedResidentIds.length) {
          showToast({
            type: "error",
            message: "Selected flats do not have any current resident allocation.",
          });
          return;
        }
        resident_ids = selectedFlatMappedResidentIds;
      }

      const response = await adminApi.createNotification({
        title: values.title,
        message: values.message,
        resident_ids,
      });

      showToast({ type: "success", message: "Notification sent." });
      if (response?.push?.sent === true) {
        const delivered = response?.push?.response?.recipients;
        const deliveredText =
          typeof delivered === "number" ? `Push accepted for ${delivered} device(s).` : "Push accepted.";
        showToast({ type: "success", message: deliveredText });
      }
      if (response?.push?.sent === false) {
        showToast({
          type: "error",
          message: `Push not delivered: ${response?.push?.reason || "unknown_reason"}`,
        });
      }
      setOpen(false);
      resetComposer();
      await loadNotifications();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white sm:w-auto"
        >
          Send Notification
        </button>
      </div>

      {notificationsState.status === "loading" ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 lg:hidden">
            {notificationsState.items?.length ? (
              notificationsState.items.map((notification) => (
                <div key={notification.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-700 break-words">{notification.message}</p>
                  <div className="mt-2 text-xs text-slate-600">
                    <p>Recipients: {notification.recipients_count ?? 0}</p>
                    <p>Created: {notification.created_at?.slice(0, 10) || "-"}</p>
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
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {notificationsState.items?.length ? (
                  notificationsState.items.map((notification) => (
                    <tr key={notification.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">{notification.title}</td>
                      <td className="px-4 py-3 text-slate-700">{notification.message}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {notification.recipients_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {notification.created_at?.slice(0, 10)}
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

      <Modal
        open={open}
        title="Send Notification"
        onClose={() => {
          setOpen(false);
          resetComposer();
        }}
      >
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Target</label>
            <select
              value={selectedTarget}
              onChange={(event) => setSelectedTarget(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="__all__">Select all active flats (default)</option>
              {activeAllocatedFlats.map((flat) => (
                <option key={flat.id} value={flat.id}>
                  {flat.flat_number} - {flat.owner_name || "Allocated"}
                </option>
              ))}
            </select>
          </div>
          <input
            {...form.register("title")}
            placeholder="Notification title"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {form.formState.errors.title ? (
            <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
          ) : null}
          <textarea
            {...form.register("message")}
            placeholder="Notification message"
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {form.formState.errors.message ? (
            <p className="text-xs text-red-600">{form.formState.errors.message.message}</p>
          ) : null}

          {targetsLoading ? <p className="text-xs text-slate-500">Loading flats...</p> : null}
          <div className="flex justify-end">
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Send
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
