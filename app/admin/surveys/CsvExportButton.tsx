"use client";

import * as React from "react";
import { Download } from "lucide-react";

interface CsvExportButtonProps {
  data: any[];
}

export function CsvExportButton({ data }: CsvExportButtonProps) {
  const downloadCsv = () => {
    if (!data || data.length === 0) return;

    // Headers
    const headers = [
      "Response ID",
      "Submitted At",
      "Client Name",
      "Client Email",
      "Reference Type",
      "Reference ID",
      "Rating (1-5)",
      "NPS Score (1-10)",
      "Response Time Rating (1-5)",
      "Resolution Rating (1-5)",
      "Professionalism Rating (1-5)",
      "Comments",
      "Follow-up Permitted",
      "Reviewed By",
      "Reviewed At",
      "Internal Notes"
    ];

    // Map rows
    const rows = data.map((item) => {
      const req = item.SurveyRequest || {};
      return [
        item.id,
        item.submittedAt ? new Date(item.submittedAt).toISOString() : "",
        req.contactName || "",
        req.contactEmail || "",
        req.relatedType || "",
        req.relatedId || "",
        item.rating !== null ? item.rating : "",
        item.npsScore !== null ? item.npsScore : "",
        item.responseTimeRating !== null ? item.responseTimeRating : "",
        item.resolutionRating !== null ? item.resolutionRating : "",
        item.professionalismRating !== null ? item.professionalismRating : "",
        (item.comments || "").replace(/"/g, '""'), // Escape quotes for CSV
        item.allowFollowUp ? "TRUE" : "FALSE",
        item.reviewedBy || "",
        item.reviewedAt ? new Date(item.reviewedAt).toISOString() : "",
        (item.internalNotes || "").replace(/"/g, '""')
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cyvrix_survey_responses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadCsv}
      disabled={!data || data.length === 0}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-colors border ${
        !data || data.length === 0
          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
          : "bg-white border-slate-200 text-[#041635] hover:border-[#2691F0] hover:text-[#2691F0]"
      }`}
    >
      <Download className="h-4 w-4" />
      Export to CSV
    </button>
  );
}
