"use client";

import { useCallback, useEffect, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import Modal from "@/components/ui/Modal";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { residentFormSchema } from "@/lib/validation/adminForms";
import { useToast } from "@/providers/ToastProvider";

const defaultValues = { name: "", email: "", phone: "", password: "" };

const extractPasswordCreationError = (error) => {
  const message = error?.response?.data?.message || "";
  const nestedErrors = error?.response?.data?.errors;

  if (typeof message === "string" && /password/i.test(message)) {
    return message;
  }

  if (Array.isArray(nestedErrors)) {
    const first = nestedErrors[0];
    if (first?.message && /password/i.test(first.message)) return first.message;
    if (first?.description && /password/i.test(first.description)) return first.description;
    if (first?.error_description && /password/i.test(first.error_description)) {
      return first.error_description;
    }
  }

  return null;
};

export default function AdminResidentsPage() {
  const { showToast } = useToast();
  const [residentsState, setResidentsState] = useState({
    status: "idle",
    items: [],
    error: null,
    pagination: null,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingResident, setEditingResident] = useState(null);

  const form = useSimpleForm({
    schema: residentFormSchema,
    defaultValues
  });

  const loadResidents = useCallback(async () => {
    setResidentsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await adminApi.listResidents({ page: 1, limit: 50 });
      setResidentsState({
        status: "succeeded",
        items: data.items || [],
        error: null,
        pagination: data.pagination || null,
      });
    } catch (error) {
      setResidentsState({
        status: "failed",
        items: [],
        error: getApiErrorMessage(error),
        pagination: null,
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadResidents();
  }, [loadResidents]);

  const isSubmitting = form.formState.isSubmitting;
  const modalTitle = editingResident ? "Update Resident" : "Create Resident";

  const openCreateModal = () => {
    setEditingResident(null);
    form.reset(defaultValues);
    setCreateOpen(true);
  };

  const openEditModal = (resident) => {
    setEditingResident(resident);
    form.reset({
      name: resident.name || "",
      email: resident.email || "",
      phone: resident.phone || "",
      password: "",
    });
    setCreateOpen(true);
  };

  const closeModal = () => {
    setCreateOpen(false);
    setEditingResident(null);
    form.reset(defaultValues);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editingResident) {
        const payload = {
          name: values.name,
          email: values.email,
          phone: values.phone,
        };
        await adminApi.updateResident(editingResident.id, payload);
        showToast({ type: "success", message: "Resident updated." });
      } else {
        if (!values.password) {
          form.setError("password", { message: "Password is required for new resident." });
          return;
        }
        await adminApi.createResident(values);
        showToast({ type: "success", message: "Resident created." });
      }
      closeModal();
      await loadResidents();
    } catch (error) {
      if (!editingResident) {
        const passwordMessage = extractPasswordCreationError(error);
        if (passwordMessage) {
          form.setError("password", { message: passwordMessage });
        }
      }
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  const onToggleResidentActive = async (resident) => {
    try {
      if (resident.is_active) {
        await adminApi.deactivateResident(resident.id);
        showToast({ type: "success", message: "Resident deactivated." });
      } else {
        await adminApi.activateResident(resident.id);
        showToast({ type: "success", message: "Resident activated." });
      }
      await loadResidents();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Residents</h3>
        <button
          type="button"
          onClick={openCreateModal}
          className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add Resident
        </button>
      </div>

      {residentsState.status === "loading" ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {residentsState.items?.length ? (
              residentsState.items.map((resident) => (
                <div key={resident.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{resident.name}</p>
                  <p className="mt-1 text-xs text-slate-700 break-all">{resident.email}</p>
                  <p className="mt-1 text-xs text-slate-700">Phone: {resident.phone || "-"}</p>
                  <div className="mt-2">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        resident.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {resident.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(resident)}
                      className="cursor-pointer rounded border border-slate-300 px-3 py-2 text-xs"
                    >
                      Edit
                    </button>
                    {!resident.is_admin ? (
                      <button
                        type="button"
                        onClick={() => onToggleResidentActive(resident)}
                        className={`cursor-pointer rounded px-3 py-2 text-xs ${
                          resident.is_active ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {resident.is_active ? "Deactivate" : "Activate"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
                No residents found.
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {residentsState.items?.length ? (
                  residentsState.items.map((resident) => (
                    <tr key={resident.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">{resident.name}</td>
                      <td className="px-4 py-3 text-slate-700">{resident.email}</td>
                      <td className="px-4 py-3 text-slate-700">{resident.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            resident.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {resident.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(resident)}
                            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-xs"
                          >
                            Edit
                          </button>
                          {!resident.is_admin ? (
                            <button
                              type="button"
                              onClick={() => onToggleResidentActive(resident)}
                              className={`cursor-pointer rounded px-3 py-1 text-xs ${
                                resident.is_active
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {resident.is_active ? "Deactivate" : "Activate"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No residents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {residentsState.error ? (
        <p className="text-sm text-red-600">{residentsState.error}</p>
      ) : null}

      <Modal open={createOpen} title={modalTitle} onClose={closeModal}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <input
              {...form.register("name")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {form.formState.errors.name ? (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              {...form.register("email")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <input
              {...form.register("phone")}
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit phone number"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {form.formState.errors.phone ? (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>
          {!editingResident ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Set initial login password"
              />
              {form.formState.errors.password ? (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">8-72 chars with upper/lower/number/special.</p>
              )}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : editingResident ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
