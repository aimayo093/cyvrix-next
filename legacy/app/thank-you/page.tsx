import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ type?: string; ticket?: string; status?: string; message?: string }> }) {
  const params = await searchParams;
  const isError = params.status === "error";
  return (
    <div>
      <Navbar />
      <main className="flex min-h-screen items-center justify-center bg-white px-5 pt-28 dark:bg-slate-950">
        <section className="max-w-2xl rounded-lg border border-slate-200 p-8 text-center dark:border-white/10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-500">{isError ? "Action needed" : "Submission received"}</p>
          <h1 className="mt-4 font-outfit text-4xl font-black">{isError ? "Please review the form" : "Thank you. CYVRIX has received it."}</h1>
          <p className="mt-5 leading-7 text-slate-600 dark:text-slate-400">
            {isError ? params.message : "Your request has been saved and the configured acknowledgement/admin notifications have been queued."}
          </p>
          {params.ticket ? <p className="mt-4 rounded-md bg-cyan-50 px-4 py-3 font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">Ticket reference: {params.ticket}</p> : null}
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/" className="rounded-md border border-slate-200 px-5 py-3 font-bold dark:border-white/10">Home</Link>
            <Link href="/contact" className="rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Contact CYVRIX</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
