"use client";

import * as React from "react";

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className,
}: {
  name: string;
  defaultValue?: string;
  options: (string | { value: string; label: string })[];
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
      className={className}
    >
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
