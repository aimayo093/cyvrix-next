"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function SectionTypeSelect({
  pageId,
  defaultValue,
  options,
  className,
}: {
  pageId: string;
  defaultValue?: string;
  options: { type: string; name: string }[];
  className?: string;
}) {
  const router = useRouter();

  return (
    <select
      name="sectionType"
      required
      value={defaultValue}
      onChange={(e) => {
        router.push(`/admin/pages-cms?edit=${pageId}&tab=sections&newSection=true&type=${e.target.value}`);
      }}
      className={className}
    >
      {options.map((opt) => (
        <option key={opt.type} value={opt.type}>
          {opt.name} ({opt.type})
        </option>
      ))}
    </select>
  );
}
