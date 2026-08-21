type ServiceOption = {
  id: string;
  title: string;
};

type ServiceProductDefaults = {
  serviceId?: string | null;
  name?: string;
  description?: string;
  recommendedCustomerSize?: string;
  cadence?: string | null;
  features?: unknown;
  pricingVisible?: boolean;
  priceDisplayMode?: string;
  monthlyPrice?: { toString(): string } | number | string | null;
  annualPrice?: { toString(): string } | number | string | null;
  ctaLabel?: string;
  ctaUrl?: string | null;
  featured?: boolean;
  sortOrder?: number;
};

function featureLines(value: unknown) {
  return Array.isArray(value)
    ? value.filter((feature): feature is string => typeof feature === "string").join("\n")
    : "";
}

function priceValue(value: ServiceProductDefaults["monthlyPrice"]) {
  return value == null ? "" : value.toString();
}

const ctaRoutes = [
  ["/book-consultation?service=Managed%20Services", "Managed Services consultation"],
  ["/book-consultation?service=Cloud%20%26%20Cybersecurity", "Cloud & Cybersecurity consultation"],
  ["/book-consultation?service=Cloud%20Services", "Cloud Services consultation"],
  ["/book-consultation?service=Cybersecurity", "Cybersecurity consultation"],
  ["/book-consultation?service=Infrastructure", "Infrastructure consultation"],
  ["/book-consultation?service=Field%20Engineering", "Field Engineering consultation"],
  ["/book-consultation?service=Professional%20Services", "Professional Services consultation"],
  ["/assessments/it-health-check", "Free IT health check"],
];

export function ServiceProductFormFields({
  services,
  defaults,
}: {
  services: ServiceOption[];
  defaults?: ServiceProductDefaults;
}) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Product name
        <input name="name" required defaultValue={defaults?.name} placeholder="e.g. Managed IT Business" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Linked service (optional)
        <select name="serviceId" defaultValue={defaults?.serviceId || ""} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]">
          <option value="">No linked service</option>
          {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Public description
        <textarea name="description" required rows={3} defaultValue={defaults?.description} placeholder="Concise explanation of the service model and outcome." className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Recommended customer shape
        <input name="recommendedCustomerSize" defaultValue={defaults?.recommendedCustomerSize} placeholder="e.g. Growing teams with 25–150 users" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Cadence
        <input name="cadence" defaultValue={defaults?.cadence || ""} placeholder="e.g. Managed monthly service" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Features (one per line)
        <textarea name="features" rows={5} defaultValue={featureLines(defaults?.features)} placeholder={"User support\nDevice routines\nService reviews"} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
      </label>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pricing presentation</p>
        <label className="block text-sm font-bold text-slate-700">
          Display mode
          <select name="priceDisplayMode" defaultValue={defaults?.priceDisplayMode || "REQUEST_PRICING"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]">
            <option value="REQUEST_PRICING">Request pricing</option>
            <option value="EXACT">Show exact price</option>
            <option value="FROM">Show from price</option>
            <option value="HIDDEN">Hide pricing completely</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold text-slate-700">Monthly price
            <input name="monthlyPrice" type="number" min="0" step="0.01" defaultValue={priceValue(defaults?.monthlyPrice)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
          </label>
          <label className="block text-sm font-bold text-slate-700">Annual price
            <input name="annualPrice" type="number" min="0" step="0.01" defaultValue={priceValue(defaults?.annualPrice)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs font-bold leading-5 text-slate-600">
          <input name="pricingVisible" value="true" type="checkbox" defaultChecked={defaults?.pricingVisible} className="mt-1 accent-[#2691F0]" />
          Permit an exact or “from” price to appear publicly when a valid amount is supplied.
        </label>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        CTA label
        <input name="ctaLabel" defaultValue={defaults?.ctaLabel || "Request pricing"} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        CTA destination
        <select name="ctaUrl" defaultValue={defaults?.ctaUrl || "/book-consultation?service=Managed%20Services"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]">
          {ctaRoutes.map(([href, label]) => <option key={href} value={href}>{label}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">Sort order
          <input name="sortOrder" type="number" min="0" max="10000" defaultValue={defaults?.sortOrder ?? 0} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]" />
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700">
          <input name="featured" value="true" type="checkbox" defaultChecked={defaults?.featured} className="accent-[#2691F0]" />
          Feature this product
        </label>
      </div>
    </>
  );
}
