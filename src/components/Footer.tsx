import React from "react";
import { Shield, Globe, Mail, ExternalLink, Cpu, Heart, CheckCircle2 } from "lucide-react";

export const Footer: React.FC = () => {
  const ecosystemPlatforms = [
    { name: "ind.shiksha", desc: "Universal Open Knowledge Graph", domain: "https://ind.shiksha" },
    { name: "ind.doctor", desc: "Sovereign Healthcare Intelligence", domain: "https://ind.doctor" },
    { name: "ind.law", desc: "Statutory Jurisprudence & Legal Engine", domain: "https://ind.law" },
    { name: "ind.gold", desc: "Bullion Verification & Reserves", domain: "https://ind.gold" },
    { name: "ind.engineer", desc: "Deep-Tech Systems & Infrastructure", domain: "https://ind.engineer" },
    { name: "ind.investments", desc: "Quantitative Capital & Algo Trading", domain: "https://ind.investments" },
  ];

  return (
    <footer className="border-t border-[#1e232e] bg-[#0c0e13] font-mono text-[#cbd5e1] mt-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-[#1a1e27]">
          {/* Brand & Mission */}
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <img
                src="https://avatars.githubusercontent.com/u/34476702?v=4"
                alt="Algo2World logo"
                className="w-8 h-8 rounded border border-blue-500/40 object-cover shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              />
              <div>
                <span className="font-bold text-white text-base">mikrotik-toolkit</span>
                <p className="text-[10px] text-blue-400 font-semibold">An Algo2World Initiative</p>
              </div>
            </div>
            <p className="text-xs text-[#858d9d] leading-relaxed mb-3">
              Enterprise-grade network automation, continuous CIS security auditing, and automated disaster recovery for MikroTik RouterOS v7 hardware and CHR instances.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#9ca3af]">
              <span>Architected by</span>
              <a
                href="https://algo2world.com"
                target="_blank"
                rel="noreferrer"
                className="text-white font-bold hover:text-blue-400 underline decoration-blue-500/40"
              >
                Algo2World & Nikil
              </a>
            </div>
          </div>

          {/* Ind. Sovereign Ecosystem */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Ind. Sovereign Ecosystem Platforms
              </h4>
              <span className="text-[10px] text-[#717b8c]">Interconnected Sovereign Nodes</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ecosystemPlatforms.map((p) => (
                <a
                  key={p.name}
                  href={p.domain}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#12151d] hover:bg-[#181d28] border border-[#222834] hover:border-blue-500/40 p-2.5 rounded transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-blue-400">
                      {p.name}
                    </span>
                    <ExternalLink className="w-3 h-3 text-[#6b7280] group-hover:text-blue-400" />
                  </div>
                  <p className="text-[10px] text-[#788292] mt-0.5 truncate">{p.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Commercial & Copyright Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#626c7d]">
          <div className="flex items-center gap-2">
            <span>© 2026 Algo2World. Released under MIT License.</span>
            <span>•</span>
            <span className="text-emerald-400/80 font-semibold">Production Ready</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="mailto:support@algo2world.com"
              className="text-[#858d9d] hover:text-white flex items-center gap-1 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Commercial Support: support@algo2world.com</span>
            </a>
            <a
              href="https://algo2world.com"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline font-bold"
            >
              algo2world.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
