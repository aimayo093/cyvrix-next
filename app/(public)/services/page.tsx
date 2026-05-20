import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, Cpu, Cloud, Code, BarChart } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { services } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Services | CYVRIX Technologies",
  description: "Comprehensive managed IT, cybersecurity, and cloud solutions tailored for UK businesses.",
};

const icons = [Shield, Zap, Globe, Cpu, Cloud, Code, BarChart];

export default function ServicesPage() {
  return (
    <div className="pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="max-w-3xl mb-20">
          <h1 className="font-outfit text-5xl md:text-6xl font-black text-[#041635] mb-6">
            Technology services <br />
            <span className="text-[#2691F0]">built for performance.</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            From day-to-day support to long-term strategic planning, we provide the technical expertise you need to scale securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, idx) => {
            const Icon = icons[idx % icons.length] || Shield;
            return (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group p-8 rounded-2xl border border-slate-200 bg-white hover:border-[#2691F0] hover:shadow-xl hover:shadow-blue-500/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#2691F0] mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-outfit text-2xl font-bold text-[#041635] mb-4">{service.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-8">{service.summary}</p>
                <div className="flex items-center gap-2 text-sm font-black text-[#2691F0]">
                  View Service Details
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
