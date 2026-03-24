"use client";

import { useEffect, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import { userApi } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/error";
import { userChangePasswordSchema, userProfileSchema } from "@/lib/validation/userForms";
import { useToast } from "@/providers/ToastProvider";

export default function AdminProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);

  const form = useSimpleForm({
    schema: userProfileSchema,
    defaultValues: { phone: "" },
  });
  const pwdForm = useSimpleForm({
    schema: userChangePasswordSchema,
    defaultValues: { new_password: "", confirm_password: "" },
  });

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const data = await userApi.getProfile();
        if (active) {
          setProfile(data);
          form.reset({ phone: data?.phone || "" });
        }
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      }
    };
    void fetchProfile();
    return () => {
      active = false;
    };
  }, [showToast, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const data = await userApi.updateProfile({ phone: values.phone });
      setProfile(data);
      showToast({ type: "success", message: "Profile updated." });
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  const onPasswordSubmit = pwdForm.handleSubmit(async (values) => {
    try {
      await userApi.changePassword(values);
      pwdForm.reset({ new_password: "", confirm_password: "" });
      showToast({ type: "success", message: "Password updated." });
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
      <p className="text-sm text-slate-600">
        Update personal details or change passwords
      </p>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 text-sm text-slate-700">
          <p>
            <span className="font-medium">Name:</span> {profile?.name || "-"}
          </p>
          <p>
            <span className="font-medium">Email:</span> {profile?.email || "-"}
          </p>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
            <input
              {...form.register("phone")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {form.formState.errors.phone ? (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              Save Changes
            </button>
          </div>
        </form>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Change Password</h4>
        <form className="space-y-3" onSubmit={onPasswordSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              {...pwdForm.register("new_password")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {pwdForm.formState.errors.new_password ? (
              <p className="mt-1 text-xs text-red-600">
                {pwdForm.formState.errors.new_password.message}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Confirm New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              {...pwdForm.register("confirm_password")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {pwdForm.formState.errors.confirm_password ? (
              <p className="mt-1 text-xs text-red-600">
                {pwdForm.formState.errors.confirm_password.message}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              Update Password
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
