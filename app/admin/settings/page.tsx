import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSiteSetting, changeAdminPassword } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Save, Settings, KeyRound, AlertCircle, CheckCircle2, Mail } from "lucide-react";

export const metadata = { title: "System Settings | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const allSettings = await prisma.siteSetting.findMany({
    orderBy: { key: "asc" },
  });

  const company = allSettings.find((s) => s.key === "company")?.value as Record<string, string> ?? {};
  const brand = allSettings.find((s) => s.key === "brand")?.value as Record<string, string> ?? {};
  const emailConfig = allSettings.find((s) => s.key === "emailConfig")?.value as Record<string, string> ?? {};

  return (
    <div className="space-y-8 pb-16 max-w-3xl">
      {sp.status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          sp.status === "success" 
            ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
            : "bg-rose-50 border-rose-250 text-rose-800"
        }`}>
          {sp.status === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-outfit font-black text-sm uppercase tracking-wide">
              {sp.status === "success" ? "Operation Successful" : "Validation Error"}
            </h4>
            <p className="text-xs font-semibold mt-0.5 leading-relaxed">{sp.message}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]">System Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage company profile, brand, SEO, email, and operational settings.</p>
      </div>

      {/* Company Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Settings className="h-4 w-4 text-[#2691F0]" />
          <h2 className="font-outfit font-black text-[#041635]">Company Profile</h2>
        </div>
        <form action={updateSiteSetting} className="p-6 space-y-4">
          <input type="hidden" name="key" value="company" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Company Name", field: "name", placeholder: "CYVRIX Technologies" },
              { label: "Trading Name", field: "tradingName", placeholder: "CYVRIX Technologies" },
              { label: "Website URL", field: "websiteUrl", placeholder: "https://www.cyvrix.co.uk" },
              { label: "Contact Email", field: "contactEmail", placeholder: "info@cyvrix.co.uk" },
              { label: "Support Email", field: "supportEmail", placeholder: "support@cyvrix.co.uk" },
              { label: "Phone Number", field: "phone", placeholder: "+44..." },
            ].map(({ label, field, placeholder }) => (
              <label key={field} className="block text-sm font-bold text-slate-700">
                {label}
                <input
                  name={`value.${field}`}
                  defaultValue={company[field] ?? ""}
                  placeholder={placeholder}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                />
              </label>
            ))}
          </div>
          <label className="block text-sm font-bold text-slate-700">
            Office Address / Coverage
            <input name="value.address" defaultValue={company.address ?? ""}
              placeholder="UK service coverage configured in admin"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
          </label>
          <CompanySaveNote />
          <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <Save className="h-4 w-4" /> Save Company Profile
          </Button>
        </form>
      </div>

      {/* Brand & Logo Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#041635] to-[#2691F0]" />
          <h2 className="font-outfit font-black text-[#041635]">Brand & Logo</h2>
        </div>
        <form action={updateSiteSetting} className="p-6 space-y-6">
          <input type="hidden" name="key" value="brand" />

          {/* Logo Upload */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">Site Logo</p>
            <p className="text-xs text-slate-400 mb-3 font-semibold">
              This logo appears in the header and footer. Recommended: transparent PNG, max 400×120px.
              If left empty, the default text logo will be used.
            </p>
            <ImageUpload name="value.logoUrl" defaultValue={brand.logoUrl ?? ""} />
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Logo Alt Text
            <input
              name="value.logoAlt"
              defaultValue={brand.logoAlt ?? "CYVRIX Technologies"}
              placeholder="CYVRIX Technologies"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Footer Description
            <textarea
              name="value.footerDescription"
              rows={3}
              defaultValue={brand.footerDescription ?? ""}
              placeholder="Premium IT support and robust cybersecurity solutions for UK businesses..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none"
            />
          </label>

          {/* Brand Colours */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">Brand Colours</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Primary Navy", field: "navy" },
                { label: "Active Blue", field: "blue" },
                { label: "Slate", field: "slate" },
                { label: "Soft Blue", field: "softBlue" },
              ].map(({ label, field }) => (
                <label key={field} className="block text-sm font-bold text-slate-700">
                  {label}
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="color" defaultValue={brand[field] ?? "#000000"}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" readOnly />
                    <input name={`value.${field}`} defaultValue={brand[field] ?? ""}
                      placeholder="#000000"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <Save className="h-4 w-4" /> Save Brand & Logo
          </Button>
        </form>
      </div>


      {/* Email Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[#2691F0]" />
          <h2 className="font-outfit font-black text-[#041635]">Email Configuration (SMTP)</h2>
        </div>
        <form action={updateSiteSetting} className="p-6 space-y-4">
          <input type="hidden" name="key" value="emailConfig" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm font-bold text-slate-700">
              SMTP Host
              <input name="value.smtpHost" defaultValue={emailConfig.smtpHost ?? ""} placeholder="smtp.mailgun.org" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              SMTP Port
              <input name="value.smtpPort" defaultValue={emailConfig.smtpPort ?? ""} placeholder="587" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              SMTP Username
              <input name="value.smtpUser" defaultValue={emailConfig.smtpUser ?? ""} placeholder="postmaster@yourdomain.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              SMTP Password
              <PasswordInput name="value.smtpPassword" defaultValue={emailConfig.smtpPassword ? "********" : ""} placeholder="••••••••" className="mt-1.5 w-full rounded-xl border border-slate-200 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Default From Name
              <input name="value.defaultFromName" defaultValue={emailConfig.defaultFromName ?? ""} placeholder="CYVRIX Support" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Default From Email
              <input name="value.defaultFromEmail" defaultValue={emailConfig.defaultFromEmail ?? ""} placeholder="noreply@cyvrix.co.uk" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700 md:col-span-2">
              Admin Notification Inbox (Leads & Tickets)
              <input name="value.adminNotificationEmail" defaultValue={emailConfig.adminNotificationEmail ?? ""} placeholder="alerts@cyvrix.co.uk" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">
            Note: Your SMTP password is masked for security. Leaving it as ******** will preserve your existing password.
          </p>
          <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <Save className="h-4 w-4" /> Save Email Configuration
          </Button>
        </form>
      </div>

      {/* Admin Password Change */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#2691F0]" />
          <h2 className="font-outfit font-black text-[#041635]">Change Admin Password</h2>
        </div>
        <form action={changeAdminPassword} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-sm font-bold text-slate-700">
              Current Password
              <PasswordInput
                name="currentPassword"
                placeholder="••••••••"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              New Password
              <PasswordInput
                name="newPassword"
                placeholder="•••••••• (Min 8 chars)"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Confirm New Password
              <PasswordInput
                name="confirmPassword"
                placeholder="••••••••"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
              />
            </label>
          </div>
          
          <p className="text-[10px] text-slate-400 font-semibold">
            Note: Changing your password will log you out from other active sessions. Make sure you document your new password.
          </p>

          <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Update Password
          </Button>
        </form>
      </div>


      {/* Raw Settings Inspector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-outfit font-black text-[#041635]">All Settings</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Edit any setting key directly as JSON.</p>
        </div>
        <div className="divide-y divide-slate-50">
          {allSettings.map((setting) => (
            <form key={setting.key} action={updateSiteSetting} className="px-6 py-4 flex items-start gap-4">
              <input type="hidden" name="key" value={setting.key} />
              <code className="text-xs font-black text-[#2691F0] bg-blue-50 px-2 py-1 rounded mt-1 shrink-0 min-w-[80px]">{setting.key}</code>
              <textarea name="value" rows={3} defaultValue={JSON.stringify(setting.value, null, 2)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
              <button type="submit" className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#2691F0] hover:text-white transition-colors mt-1 shrink-0">
                Save
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanySaveNote() {
  return (
    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 font-semibold">
      Note: The company settings are stored as a JSON object. All fields above are saved together when you click Save.
    </p>
  );
}
