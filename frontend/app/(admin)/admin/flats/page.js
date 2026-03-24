"use client";

import { useCallback, useEffect, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import Modal from "@/components/ui/Modal";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { flatFormSchema, flatTypeFormSchema } from "@/lib/validation/adminForms";
import { useToast } from "@/providers/ToastProvider";

const PAGE_SIZE = 10;

export default function AdminFlatsPage() {
  const { showToast } = useToast();
  const [flatsState, setFlatsState] = useState({
    status: "idle",
    items: [],
    error: null,
    pagination: null,
  });
  const [flatTypes, setFlatTypes] = useState([]);
  const [residents, setResidents] = useState([]);
  const [flatModalOpen, setFlatModalOpen] = useState(false);
  const [flatTypeModalOpen, setFlatTypeModalOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("flat_number");
  const [sortOrder, setSortOrder] = useState("asc");

  const flatForm = useSimpleForm({
    schema: flatFormSchema,
    defaultValues: { flat_number: "", flat_type_id: "" }
  });
  const flatTypeForm = useSimpleForm({
    schema: flatTypeFormSchema,
    defaultValues: { name: "", description: "" }
  });

  const loadFlats = useCallback(async () => {
    setFlatsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const params = { page, limit: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      const data = await adminApi.listFlats(params);
      setFlatsState({
        status: "succeeded",
        items: data.items || [],
        error: null,
        pagination: data.pagination || null,
      });
    } catch (error) {
      setFlatsState({
        status: "failed",
        items: [],
        error: getApiErrorMessage(error),
        pagination: null,
      });
    }
  }, [page, searchTerm]);

  useEffect(() => {
    let active = true;

    const fetchLookups = async () => {
      try {
        const [flatTypeData, residentData] = await Promise.all([
          adminApi.listFlatTypes(),
          adminApi.listResidents({ page: 1, limit: 100 }),
        ]);
        if (active) {
          setFlatTypes(flatTypeData || []);
          setResidents(residentData.items || []);
        }
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFlats();
    void fetchLookups();

    return () => {
      active = false;
    };
  }, [loadFlats, showToast]);

  const getSortedFlats = () => {
    const items = [...(flatsState.items || [])];
    items.sort((a, b) => {
      if (sortBy === "is_active") {
        const aValue = a.is_active ? 1 : 0;
        const bValue = b.is_active ? 1 : 0;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aValue = String(a?.[sortBy] || "").toLowerCase();
      const bValue = String(b?.[sortBy] || "").toLowerCase();
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  };

  const sortedFlats = getSortedFlats();

  const openCreateFlatModal = () => {
    setEditingFlat(null);
    setSelectedResidentId("");
    flatForm.reset({ flat_number: "", flat_type_id: "" });
    setFlatModalOpen(true);
  };

  const openEditFlatModal = (flat) => {
    setEditingFlat(flat);
    flatForm.reset({
      flat_number: flat.flat_number || "",
      flat_type_id: flat.flat_type_id || "",
    });
    setSelectedResidentId(flat.allocated_resident_id || "");
    setFlatModalOpen(true);
  };

  const createFlatType = flatTypeForm.handleSubmit(async (values) => {
    try {
      await adminApi.createFlatType(values);
      showToast({ type: "success", message: "Flat type created." });
      flatTypeForm.reset({ name: "", description: "" });
      setFlatTypeModalOpen(false);
      const flatTypesData = await adminApi.listFlatTypes();
      setFlatTypes(flatTypesData || []);
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  const saveFlat = flatForm.handleSubmit(
    async (values) => {
      try {
        if (editingFlat) {
          await adminApi.updateFlat(editingFlat.id, values);
          const previousResidentId = editingFlat.allocated_resident_id || "";
          const nextResidentId = selectedResidentId || "";

          if (previousResidentId !== nextResidentId) {
            if (editingFlat.current_allocation_id) {
              await adminApi.endAllocation(editingFlat.current_allocation_id, {});
            }
            if (nextResidentId) {
              await adminApi.createAllocation({
                flat_id: editingFlat.id,
                resident_id: nextResidentId,
              });
            }
          }
          showToast({ type: "success", message: "Flat updated." });
        } else {
          await adminApi.createFlat(values);
          showToast({ type: "success", message: "Flat created." });
        }
        flatForm.reset({ flat_number: "", flat_type_id: "" });
        setSelectedResidentId("");
        setFlatModalOpen(false);
        setEditingFlat(null);
        await loadFlats();
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      }
    },
    (errors) => {
      if (errors?.flat_type_id) {
        showToast({ type: "error", message: "Please select / complete all the required fields." });
        return;
      }
      if (errors?.flat_number) {
        showToast({ type: "error", message: "Flat number format should be like A-101." });
        return;
      }
      showToast({ type: "error", message: "Please fix form errors before submitting." });
    }
  );

  const toggleFlatStatus = async (flat) => {
    try {
      if (flat.is_active) {
        await adminApi.deactivateFlat(flat.id);
        showToast({ type: "success", message: "Flat deleted (deactivated)." });
      } else {
        await adminApi.activateFlat(flat.id);
        showToast({ type: "success", message: "Flat activated." });
      }
      await loadFlats();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  };

  const pagination = flatsState.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Flats</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFlatTypeModalOpen(true)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Add Flat Type
          </button>
          <button
            type="button"
            onClick={openCreateFlatModal}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add Flat
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by flat number"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearchTerm(searchInput.trim());
          }}
          className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Search
        </button>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="flat_number">Sort: Flat Number</option>
          <option value="flat_type_name">Sort: Flat Type</option>
          <option value="owner_name">Sort: Owner Name</option>
          <option value="is_active">Sort: Status</option>
        </select>
        <select
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="asc">Order: Asc</option>
          <option value="desc">Order: Desc</option>
        </select>
      </div>

      {flatsState.status === "loading" ? (
        <SkeletonTable rows={6} />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sortedFlats.length ? (
              sortedFlats.map((flat) => (
                <div key={flat.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{flat.flat_number}</p>
                      <p className="text-xs text-slate-600">{flat.flat_type_name}</p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        flat.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {flat.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-700">
                    <p>
                      <span className="font-medium">Owner:</span> {flat.owner_name || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {flat.owner_email || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span> {flat.owner_phone || "-"}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openEditFlatModal(flat)}
                      className="cursor-pointer rounded border border-slate-300 px-3 py-2 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFlatStatus(flat)}
                      className={`cursor-pointer rounded px-3 py-2 text-xs ${
                        flat.is_active
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {flat.is_active ? "Delete" : "Activate"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
                No flats found.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Flat Number</th>
                <th className="px-4 py-3">Flat Type</th>
                <th className="px-4 py-3">Owner Name</th>
                <th className="hidden px-4 py-3 lg:table-cell">Owner Email</th>
                <th className="hidden px-4 py-3 xl:table-cell">Owner Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFlats.length ? (
                sortedFlats.map((flat) => (
                  <tr key={flat.id} className="border-t border-slate-200">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {flat.flat_number}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{flat.flat_type_name}</td>
                    <td className="px-4 py-3 text-slate-700">{flat.owner_name || "-"}</td>
                    <td className="hidden px-4 py-3 text-slate-700 lg:table-cell">
                      {flat.owner_email || "-"}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-700 xl:table-cell">
                      {flat.owner_phone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          flat.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {flat.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col justify-end gap-2 lg:flex-row">
                        <button
                          type="button"
                          onClick={() => openEditFlatModal(flat)}
                          className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFlatStatus(flat)}
                          className={`cursor-pointer rounded px-3 py-1 text-xs ${
                            flat.is_active
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {flat.is_active ? "Delete" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No flats found.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-600">
          Showing page {pagination.page} of {pagination.totalPages} (total {pagination.total} flats)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <Modal open={flatTypeModalOpen} title="Create Flat Type" onClose={() => setFlatTypeModalOpen(false)}>
        <form className="space-y-3" onSubmit={createFlatType}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <input
              {...flatTypeForm.register("name")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {flatTypeForm.formState.errors.name ? (
              <p className="mt-1 text-xs text-red-600">{flatTypeForm.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
            <textarea
              {...flatTypeForm.register("description")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              Create
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={flatModalOpen}
        title={editingFlat ? "Edit Flat" : "Create Flat"}
        onClose={() => {
          setFlatModalOpen(false);
          setEditingFlat(null);
          setSelectedResidentId("");
          flatForm.reset({ flat_number: "", flat_type_id: "" });
        }}
      >
        <form className="space-y-3" onSubmit={saveFlat}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Flat Number</label>
            <input
              {...flatForm.register("flat_number")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Flat Type</label>
            <select
              {...flatForm.register("flat_type_id")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select flat type</option>
              {flatTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          {editingFlat ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Flat Allocation (Resident)
              </label>
              <select
                value={selectedResidentId}
                onChange={(event) => setSelectedResidentId(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">No resident allocated</option>
                {residents
                  .filter((resident) => resident.is_active)
                  .map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.name} ({resident.email})
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Changing this value updates the active allocation for this flat.
              </p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              {editingFlat ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
