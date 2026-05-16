import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { submitQuote } from "@/lib/actions";
import { industries, services } from "@/lib/cyvrix-data";

export const metadata = { title: "Request a Quote" };

export default function RequestQuotePage() {
  return (
    <div>
      <Navbar />
      <main className="min-h-screen bg-white pt-28 dark:bg-slate-950">
        <section className="mx-auto max-w-5xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">Request quote</p>
          <h1 className="mt-4 font-outfit text-4xl font-black md:text-6xl">Tell CYVRIX what you need to improve.</h1>
          <p className="mt-5 max-w-3xl leading-8 text-slate-600 dark:text-slate-400">This creates a quote request and lead record in the CRM, sends an acknowledgement, and notifies the admin mailbox when configured.</p>
          <form action={submitQuote} className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="businessName" label="Business name" required />
              <Field name="contactName" label="Contact name" required />
              <Field name="email" label="Email" type="email" required />
              <Field name="phone" label="Phone" />
              <Select name="companySize" label="Company size" options={["1-10", "11-50", "51-200", "201-500", "500+"]} required />
              <Select name="industry" label="Industry" options={industries.map((item) => item.title)} required />
              <Select name="service" label="Service required" options={services.map((item) => item.title)} required />
              <Select name="urgency" label="Urgency" options={["Planning", "Within 30 days", "Urgent", "Emergency"]} required />
              <Select name="budget" label="Budget range optional" options={["Not sure yet", "Under GBP 2,500", "GBP 2,500-10,000", "GBP 10,000-50,000", "GBP 50,000+"]} />
              <Field name="preferredTime" label="Preferred consultation time" />
            </div>
            <label className="mt-4 block text-sm font-bold">Current challenge<textarea name="challenge" required rows={6} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950" /></label>
            <label className="mt-4 block text-sm font-bold">Attachment upload optional<input name="attachment" type="file" className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm dark:border-white/20 dark:bg-slate-950" /></label>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"><input name="consent" type="checkbox" required className="mt-1" />I consent to CYVRIX Technologies processing this request and contacting me about it.</label>
            <button className="mt-5 rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Submit quote request</button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<input name={name} type={type} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950" /></label>;
}

function Select({ name, label, options, required = false }: { name: string; label: string; options: string[]; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<select name={name} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
