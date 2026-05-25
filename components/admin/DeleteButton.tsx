"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

export function DeleteButton({ message }: { message: string }) {
  return (
    <button
      type="submit"
      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
      title="Delete"
      onClick={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
