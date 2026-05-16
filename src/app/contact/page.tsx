import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { submitContact } from "@/lib/actions";
import { industries, services, siteSettings } from "@/lib/cyvrix-data";

export const metadata = { title: "Contact CYVRIX Technologies" };

export default function ContactPage() {
  return (
    <div>
      <Navbar />
      <main className="min-h-screen bg-white pt-28 dark:bg-slate-950">
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">Contact</p>
            <h1 className="mt-4 font-outfit text-4xl font-black md:text-6xl">Speak to CYVRIX about support, security, cloud, or consultancy.</h1>
            <p className="mt-6 leading-8 text-slate-600 dark:text-slate-400">Contact details are managed in admin settings, so no final address, phone, or email is hardcoded into the public website.</p>
            <div className="mt-8 grid gap-4 text-sm">
              <Info label="Email" value={siteSettings.supportEmail} />
              <Info label="Phone" value={siteSettings.phone} />
              <Info label="Office and coverage" value={siteSettings.address} />
              <Info label="Service coverage" value={siteSettings.coverage} />
            </div>
            <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-white/20 dark:text-slate-400">Google Maps or location embed can be enabled from admin once the final service address is confirmed.</div>
          </div>
          <form action={submitContact} className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="name" label="Name" required />
              <Field name="email" label="Email" type="email" required />
              <Field name="company" label="Company" />
              <Select name="businessType" label="Business type" options={industries.map((item) => item.title)} />
              <Select name="service" label="Service interest" options={services.map((item) => item.title)} required />
              <Select name="urgency" label="Urgency" options={["Planning ahead", "This month", "Urgent", "Incident or outage"]} />
              <Select name="preferredContact" label="Preferred contact method" options={["Email", "Phone", "Video call"]} />
            </div>
            <label className="mt-4 block text-sm font-bold">Message<textarea name="message" required rows={6} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950" /></label>
            <button className="mt-5 rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Send enquiry</button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 p-4 dark:border-white/10"><p className="font-bold">{label}</p><p className="mt-1 text-slate-600 dark:text-slate-400">{value}</p></div>;
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<input name={name} type={type} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950" /></label>;
}

function Select({ name, label, options, required = false }: { name: string; label: string; options: string[]; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<select name={name} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
