import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSiteSetting } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { PhoneCall, Mail, MapPin, Clock, Headphones, Sparkles, Building, Briefcase } from "lucide-react";

export const metadata = { title: "Contact Us CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function ContactCMSPage() {
  await requireAdmin();

  const settingsRecord = await prisma.siteSetting.findUnique({
    where: { key: "contact_settings" },
  });

  const settings = (settingsRecord?.value as Record<string, string>) || {
    salesEmail: "sales@cyvrix.co.uk",
    supportEmail: "support@cyvrix.co.uk",
    phone: "+44 (0) 20 8080 8080",
    hqAddress: "City of London, UK",
    salesSla: "< 1hr",
    supportSla: "15-min Critical SLA",
    phoneHours: "Mon-Fri: 8am - 6pm",
    hqDetails: "Secure Site Operations"
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <PhoneCall className="h-8 w-8 text-[#2691F0]" />
            Contact Us CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage contact emails, phone numbers, and location details displayed on the public Contact page.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:p-8">
        <form action={updateSiteSetting} className="space-y-8">
          <input type="hidden" name="key" value="contact_settings" />
          
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
                SLA / Response Time Text
                <input
                  name="value.salesSla"
                  defaultValue={settings.salesSla}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
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
                SLA / Priority Text
                <input
                  name="value.supportSla"
                  defaultValue={settings.supportSla}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
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
                Operating Hours
                <input
                  name="value.phoneHours"
                  defaultValue={settings.phoneHours}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
            </div>

            {/* Headquarters */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-[#2691F0]" />
                <h3 className="font-outfit text-lg font-bold text-slate-800">London Headquarters</h3>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Address/Location
                <input
                  name="value.hqAddress"
                  defaultValue={settings.hqAddress}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Location Details
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
              Save Contact Info
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
