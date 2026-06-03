import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe, Cpu, Cloud, Code, BarChart } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Services | CYVRIX Technologies",
  description: "Comprehensive managed IT, cybersecurity, and cloud solutions tailored for UK businesses.",
};

const icons = [Shield, Zap, Globe, Cpu, Cloud, Code, BarChart];

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" }
  });

  return (
    <div className="min-h-screen bg-[#020817] pt-24 pb-32 text-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="max-w-3xl mb-20">
          <h1 className="font-outfit text-5xl md:text-6xl font-black text-white mb-6">
            Technology services <br />
            <span className="text-[#2691F0]">built for performance.</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            From day-to-day support to long-term strategic planning, we provide the technical expertise you need to scale securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, idx) => {
            const Icon = icons[idx % icons.length] || Shield;
            const imageUrl = (service.content as any)?.image;
            return (
              <a
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group rounded-2xl border border-white/10 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col min-h-[320px]"
              >
                {/* Background Image Layer */}
                {imageUrl ? (
                  <>
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${imageUrl})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#041635] via-[#041635]/80 to-black/20" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[#020817] group-hover:bg-[#020817] transition-colors" />
                )}

                {/* Content Layer */}
                <div className="relative p-8 flex flex-col h-full z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-auto group-hover:scale-110 transition-transform ${imageUrl ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-[#2691F0]/10 text-[#2691F0]'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-8">
                    <h3 className={`font-outfit text-2xl font-bold mb-4 ${imageUrl ? 'text-white' : 'text-white'}`}>{service.title}</h3>
                    <p className={`text-sm leading-relaxed mb-8 ${imageUrl ? 'text-slate-300' : 'text-slate-400'}`}>{service.summary}</p>
                    <div className={`flex items-center gap-2 text-sm font-black transition-colors ${imageUrl ? 'text-[#2691F0] group-hover:text-white' : 'text-[#2691F0] group-hover:text-white'}`}>
                      View Service Details
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
