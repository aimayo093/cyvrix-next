import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { submitTicket } from "@/lib/actions";

export const metadata = { title: "Submit Support Ticket" };

export default function SupportPage() {
  return (
    <div>
      <Navbar />
      <main className="min-h-screen bg-white pt-28 dark:bg-slate-950">
        <section className="mx-auto max-w-5xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">IT support</p>
          <h1 className="mt-4 font-outfit text-4xl font-black md:text-6xl">Submit a CYVRIX support ticket.</h1>
          <p className="mt-5 max-w-3xl leading-8 text-slate-600 dark:text-slate-400">Tickets are saved with a generated reference such as CYV-TKT-000001 style numbering, then routed into the admin ticket management workflow.</p>
          <form action={submitTicket} className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="name" label="Name" required />
              <Field name="email" label="Email" type="email" required />
              <Field name="company" label="Company" required />
              <Select name="priority" label="Priority" options={["Low", "Normal", "High", "Critical"]} required />
              <Select name="category" label="Category" options={["User access", "Email", "Device", "Network", "Cybersecurity", "Cloud", "Backup", "Other"]} required />
              <Select name="existingClient" label="Existing client" options={["yes", "no"]} />
            </div>
            <Field name="subject" label="Subject" required />
            <label className="mt-4 block text-sm font-bold">Description<textarea name="description" required rows={7} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950" /></label>
            <label className="mt-4 block text-sm font-bold">Attachment<input name="attachment" type="file" className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm dark:border-white/20 dark:bg-slate-950" /></label>
            <button className="mt-5 rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Create support ticket</button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="mt-4 block text-sm font-bold">{label}<input name={name} type={type} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950" /></label>;
}

function Select({ name, label, options, required = false }: { name: string; label: string; options: string[]; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<select name={name} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
