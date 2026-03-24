"use client";

import { useCallback, useEffect, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import Modal from "@/components/ui/Modal";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { subscriptionPlanFormSchema } from "@/lib/validation/adminForms";
import { useToast } from "@/providers/ToastProvider";

export default function AdminSubscriptionsPage() {
  const { showToast } = useToast();
  const [flatTypes, setFlatTypes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);

  const planForm = useSimpleForm({
    schema: subscriptionPlanFormSchema,
    defaultValues: { flat_type_id: "", monthly_amount: "", effective_from: "" }
  });
  const currentRates = (() => {
    const ratesByFlatType = new Map();
    const sortedPlans = [...plans].sort(
      (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
    );

    for (const plan of sortedPlans) {
      if (!ratesByFlatType.has(plan.flat_type_id)) {
        ratesByFlatType.set(plan.flat_type_id, plan);
      }
    }

    return flatTypes.map((flatType) => {
      const currentPlan = ratesByFlatType.get(flatType.id) || null;
      return {
        flat_type_id: flatType.id,
        flat_type_name: flatType.name,
        current_plan_id: currentPlan?.id || null,
        monthly_amount: currentPlan?.monthly_amount || null,
        effective_from: currentPlan?.effective_from || null,
      };
    });
  })();

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const todayDateInput = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    try {
      const [flatTypeData, planData] = await Promise.all([
        adminApi.listFlatTypes(),
        adminApi.listSubscriptionPlans(),
      ]);
      setFlatTypes(flatTypeData || []);
      setPlans(planData || []);
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadData();
    };
    void run();
    return () => {
      active = false;
    };
  }, [loadData]);

  const createPlan = planForm.handleSubmit(async (values) => {
    try {
      await adminApi.createSubscriptionPlan(values);
      showToast({
        type: "success",
        message: editingRate ? "Rate updated." : "Plan created.",
      });
      setPlanOpen(false);
      setEditingRate(null);
      planForm.reset({ flat_type_id: "", monthly_amount: "", effective_from: "" });
      await loadData();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  const openCreatePlanModal = () => {
    setEditingRate(null);
    planForm.reset({ flat_type_id: "", monthly_amount: "", effective_from: todayDateInput });
    setPlanOpen(true);
  };

  const openUpdateRateModal = (rate) => {
    setEditingRate(rate);
    planForm.reset({
      flat_type_id: rate.flat_type_id,
      monthly_amount: rate.monthly_amount || "",
      effective_from: todayDateInput,
    });
    setPlanOpen(true);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Subscriptions</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreatePlanModal}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
          >
            Add/Update Rate
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
          Current Subscription Amount (Flat Type Wise)
        </div>
        <div className="space-y-3 p-3 md:p-0">
          <div className="grid gap-3 md:hidden">
            {currentRates.map((rate) => (
              <div key={rate.flat_type_id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{rate.flat_type_name}</p>
                <p className="mt-1 text-xs text-slate-700">
                  Current Amount: {formatCurrency(rate.monthly_amount)}
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  Effective From: {rate.effective_from ? String(rate.effective_from).slice(0, 10) : "-"}
                </p>
                <button
                  type="button"
                  onClick={() => openUpdateRateModal(rate)}
                  className="mt-3 w-full cursor-pointer rounded border border-slate-300 px-3 py-2 text-xs"
                >
                  Update Rate
                </button>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2">Flat Type</th>
                  <th className="px-4 py-2">Current Monthly Amount</th>
                  <th className="px-4 py-2">Effective From</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRates.map((rate) => (
                  <tr key={rate.flat_type_id} className="border-t border-slate-200">
                    <td className="px-4 py-2 font-medium text-slate-900">{rate.flat_type_name}</td>
                    <td className="px-4 py-2">{formatCurrency(rate.monthly_amount)}</td>
                    <td className="px-4 py-2">
                      {rate.effective_from ? String(rate.effective_from).slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openUpdateRateModal(rate)}
                        className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-xs"
                      >
                        Update Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
          Subscription Plan History
        </div>
        <div className="space-y-3 p-3 md:p-0">
          <div className="grid gap-3 md:hidden">
            {plans.length ? (
              plans.map((plan) => (
                <div key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{plan.flat_type_name}</p>
                  <p className="mt-1 text-xs text-slate-700">Amount: {plan.monthly_amount}</p>
                  <p className="mt-1 text-xs text-slate-700">
                    Effective From: {plan.effective_from?.slice(0, 10) || "-"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
                No plan history found.
              </div>
            )}
          </div>
          <div className="hidden max-h-[380px] overflow-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2">Flat Type</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Effective From</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-t border-slate-200">
                    <td className="px-4 py-2">{plan.flat_type_name}</td>
                    <td className="px-4 py-2">{plan.monthly_amount}</td>
                    <td className="px-4 py-2">{plan.effective_from?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={planOpen}
        title={editingRate ? "Update Monthly Rate" : "Create Subscription Plan"}
        onClose={() => {
          setPlanOpen(false);
          setEditingRate(null);
        }}
      >
        <form className="space-y-3" onSubmit={createPlan}>
          <select
            {...planForm.register("flat_type_id")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            disabled={Boolean(editingRate)}
          >
            <option value="">Select flat type</option>
            {flatTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Monthly amount"
            {...planForm.register("monthly_amount")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            {...planForm.register("effective_from")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500">A new rate row is added from selected date.</p>
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              {editingRate ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

    </section>
  );
}
