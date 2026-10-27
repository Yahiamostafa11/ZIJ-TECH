"use client";

import React from "react";
import { Printer } from "lucide-react";
import { buttonClass } from "@/components/portal/ui";

/** Opens the browser's print dialog, where "Save as PDF" makes the file. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonClass("primary")} print:hidden`}>
      <Printer size={16} /> {label}
    </button>
  );
}
