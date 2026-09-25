"use client";

import React, { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/forms";
import { buttonClass } from "./ui";

const FormStateContext = createContext<ActionState>({});

type ActionFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  /** Clear the inputs after a successful submit (for "add another" forms). */
  resetOnSuccess?: boolean;
};

export function ActionForm({ action, children, className, resetOnSuccess }: ActionFormProps) {
  const [state, formAction] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className} noValidate>
      <FormStateContext.Provider value={state}>{children}</FormStateContext.Provider>
    </form>
  );
}

export function FieldError({ name }: { name: string }) {
  const state = useContext(FormStateContext);
  const t = useTranslations("errors");
  const code = state.fieldErrors?.[name];
  if (!code) return null;
  return <p className="text-xs text-danger">{t(code)}</p>;
}

/** Form-level outcome: an error, or a success message. */
export function FormMessage() {
  const state = useContext(FormStateContext);
  const tErrors = useTranslations("errors");
  const tMessages = useTranslations("messages");

  return (
    <p role="status" className={`min-h-5 text-sm ${state.error ? "text-danger" : "text-gold-light"}`}>
      {state.error ? tErrors(state.error) : state.message ? tMessages(state.message) : ""}
    </p>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass(variant)} ${className}`}>
      {children}
    </button>
  );
}
