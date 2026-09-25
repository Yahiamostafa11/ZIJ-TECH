"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/portal/ActionForm";
import { Field, inputClass } from "@/components/portal/ui";

const DEFAULT_CAPACITY = { offline: [6, 10], online: [2, 5] } as const;

type Props = {
  branches: { id: number; name: string }[];
  /** Only admins without a branch restriction manage online groups. */
  allowOnline: boolean;
  defaults?: {
    mode: "offline" | "online";
    branchId: number | null;
    capacityMin: number;
    capacityMax: number;
  };
};

/** Mode, branch and capacity: online groups have no branch and smaller defaults. */
export function GroupModeFields({ branches, allowOnline, defaults }: Props) {
  const t = useTranslations();
  const [mode, setMode] = useState<"offline" | "online">(defaults?.mode ?? "offline");
  const [capacity, setCapacity] = useState<readonly number[]>(
    defaults ? [defaults.capacityMin, defaults.capacityMax] : DEFAULT_CAPACITY.offline,
  );

  return (
    <>
      <Field label={t("fields.mode")} htmlFor="group-mode">
        <select
          id="group-mode"
          name="mode"
          value={mode}
          onChange={(event) => {
            const next = event.target.value as "offline" | "online";
            setMode(next);
            if (!defaults) setCapacity(DEFAULT_CAPACITY[next]);
          }}
          className={inputClass}
        >
          <option value="offline">{t("options.mode.offline")}</option>
          {(allowOnline || mode === "online") && <option value="online">{t("options.mode.online")}</option>}
        </select>
      </Field>

      {mode === "offline" ? (
        <Field label={t("fields.branch")} htmlFor="group-branch">
          <select id="group-branch" name="branchId" defaultValue={defaults?.branchId ?? branches[0]?.id ?? ""} className={inputClass}>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <FieldError name="branchId" />
        </Field>
      ) : (
        <input type="hidden" name="branchId" value="" />
      )}

      <Field label={t("groups.capacityMin")} htmlFor="group-capacityMin">
        <input
          id="group-capacityMin"
          name="capacityMin"
          type="number"
          min={1}
          max={50}
          value={capacity[0]}
          onChange={(event) => setCapacity([Number(event.target.value), capacity[1]])}
          className={inputClass}
        />
        <FieldError name="capacityMin" />
      </Field>
      <Field label={t("groups.capacityMax")} htmlFor="group-capacityMax">
        <input
          id="group-capacityMax"
          name="capacityMax"
          type="number"
          min={1}
          max={50}
          value={capacity[1]}
          onChange={(event) => setCapacity([capacity[0], Number(event.target.value)])}
          className={inputClass}
        />
        <FieldError name="capacityMax" />
      </Field>
    </>
  );
}
