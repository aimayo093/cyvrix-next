import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { connection } from "next/server";
import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateContactSettings } from "@/lib/admin-actions";
import { toPublicContactSettings } from "@/lib/contact-settings";
import { Button } from "@/components/shared/Button";
import { PhoneCall, MapPin, Headphones, Sparkles } from "lucide-react";

export const metadata = { title: "Contact Us CMS" };

export default function ContactCMSPage() {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <ContactCMSPageContent />
    </React.Suspense>
  );
}

async function ContactCMSPageContent() {
  await connection();
  await requireAdmin();

  const settingsRecord = await prisma.siteSetting.findUnique({
    where: { key: "contact_settings" },
  });

  const settings = toPublicContactSettings(settingsRecord?.value);

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <PhoneCall className="h-8 w-8 text-[#2691F0]" />
            Contact Us CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Publish only approved contact channels and location details for the public Contact page.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:p-8">
        <form action={updateContactSettings} className="space-y-8">

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            These values are public when saved. Leave a field blank until its email address, telephone number, location or operating hours have been verified for public use. Response targets, certifications and contractual terms are managed in their approved service and Trust content, not here.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sales & Consulting */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-[#2691F0]" />
                <h3 className="font-outfit text-lg font-bold text-slate-800">Sales & Consulting</h3>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Email Address
                <input
                  name="value.salesEmail"
                  defaultValue={settings.salesEmail}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                <span className="mt-1.5 block text-xs font-medium leading-5 text-slate-400">Only enter a monitored, approved address.</span>
              </label>
            </div>

            {/* Support Desk */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="h-5 w-5 text-[#2691F0]" />
                <h3 className="font-outfit text-lg font-bold text-slate-800">Technical Support Desk</h3>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Email Address
                <input
                  name="value.supportEmail"
                  defaultValue={settings.supportEmail}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                <span className="mt-1.5 block text-xs font-medium leading-5 text-slate-400">Only enter a support channel customers are authorised to use.</span>
              </label>
            </div>

            {/* Corporate Phone Line */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <PhoneCall className="h-5 w-5 text-[#2691F0]" />
                <h3 className="font-outfit text-lg font-bold text-slate-800">Corporate Phone Line</h3>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Phone Number
                <input
                  name="value.phone"
                  defaultValue={settings.phone}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Operating Hours (optional)
                <input
                  name="value.phoneHours"
                  defaultValue={settings.phoneHours}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
            </div>

            {/* Service location */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-[#2691F0]" />
                <h3 className="font-outfit text-lg font-bold text-slate-800">Service Location</h3>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Address or location (optional)
                <input
                  name="value.hqAddress"
                  defaultValue={settings.hqAddress}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Additional location details (optional)
                <input
                  name="value.hqDetails"
                  defaultValue={settings.hqDetails}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold px-8">
              Save approved contact details
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
