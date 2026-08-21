"use client";

import { useSearchParams } from "next/navigation";

const serviceOptions = [
  "General Technology Review",
  "Managed Services",
  "Cloud & Cybersecurity",
  "Cloud Services",
  "Cybersecurity",
  "Infrastructure",
  "Field Engineering",
  "Professional Services",
];

export function BookingServiceSelect() {
  const searchParams = useSearchParams();
  const requestedService = searchParams.get("service");
  const selectedService = serviceOptions.includes(requestedService || "")
    ? requestedService!
    : "General Technology Review";

  return (
    <select
      key={selectedService}
      name="service"
      required
      defaultValue={selectedService}
      className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2691F0] transition-all font-semibold"
    >
      {serviceOptions.map((option) => (
        <option key={option} value={option} className="bg-[#020817] text-white">
          {option}
        </option>
      ))}
    </select>
  );
}
