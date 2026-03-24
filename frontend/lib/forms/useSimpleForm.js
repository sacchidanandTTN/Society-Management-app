"use client";

import { useState } from "react";

const toFieldErrors = (zodError) => {
  const flattened = zodError?.flatten?.();
  const fieldErrors = flattened?.fieldErrors || {};
  const result = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      result[field] = { message: messages[0] };
    }
  }

  if (flattened?.formErrors?.length) {
    result.root = { message: flattened.formErrors[0] };
  }

  return result;
};

export const useSimpleForm = ({ schema, defaultValues = {} }) => {
  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = (nextValues = defaultValues) => {
    setValues(nextValues);
    setErrors({});
  };

  const setError = (field, error) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const register = (field) => ({
    name: field,
    value: values[field] ?? "",
    onChange: (event) => {
      const nextValue = event?.target?.value ?? "";
      setValues((prev) => ({ ...prev, [field]: nextValue }));
    },
  });

  const handleSubmit = (onValid, onInvalid) => async (event) => {
    event.preventDefault();
    setErrors({});

    const parsed = schema ? schema.safeParse(values) : { success: true, data: values };
    if (!parsed.success) {
      const nextErrors = toFieldErrors(parsed.error);
      setErrors(nextErrors);
      if (typeof onInvalid === "function") {
        onInvalid(nextErrors);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onValid(parsed.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  };
};
