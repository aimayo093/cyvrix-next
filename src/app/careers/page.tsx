import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { submitJobApplication } from "@/lib/actions";
import { jobs } from "@/lib/cyvrix-data";

export const metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <div>
      <Navbar />
      <main className="min-h-screen bg-white pt-28 dark:bg-slate-950">
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">Careers</p>
          <h1 className="mt-4 max-w-4xl font-outfit text-4xl font-black md:text-6xl">Build calm, secure technology operations for ambitious UK organisations.</h1>
          <p className="mt-6 max-w-3xl leading-8 text-slate-600 dark:text-slate-400">The careers page is hidden from the main nav by default and managed through admin job management.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {jobs.map((job) => (
              <div key={job.title} className="rounded-lg border border-slate-200 p-6 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-500">{job.type}</p>
                <h2 className="mt-3 font-outfit text-2xl font-black">{job.title}</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">{job.location}</p>
                <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">{job.summary}</p>
              </div>
            ))}
          </div>
          <form action={submitJobApplication} className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="name" label="Name" required />
              <Field name="email" label="Email" type="email" required />
              <label className="block text-sm font-bold">Role<select name="role" required className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">{jobs.map((job) => <option key={job.title}>{job.title}</option>)}</select></label>
              <label className="block text-sm font-bold">CV upload<input name="cv" type="file" className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-sm dark:border-white/20 dark:bg-slate-950" /></label>
            </div>
            <label className="mt-4 block text-sm font-bold">Why CYVRIX?<textarea name="message" required rows={5} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950" /></label>
            <label className="mt-4 flex gap-3 text-sm text-slate-600 dark:text-slate-400"><input name="consent" type="checkbox" required />I consent to CYVRIX processing this application.</label>
            <button className="mt-5 rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Submit application</button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<input name={name} type={type} required={required} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950" /></label>;
}
