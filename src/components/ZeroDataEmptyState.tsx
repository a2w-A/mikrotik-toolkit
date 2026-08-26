import React from "react";
import { Server, Plus, Shield, Terminal, Globe, KeyRound, CheckCircle2, ArrowRight } from "lucide-react";

interface ZeroDataEmptyStateProps {
  onOpenAddRouter: () => void;
  tabTitle?: string;
}

export const ZeroDataEmptyState: React.FC<ZeroDataEmptyStateProps> = ({
  onOpenAddRouter,
  tabTitle = "Live Telemetry & Diagnostics",
}) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 font-mono text-[#e1e4ea]">
      <div className="bg-[#141720] border-2 border-dashed border-[#2d333d] rounded-xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glowing background accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex p-4 bg-[#1a1e29] border border-blue-500/30 rounded-2xl text-blue-400 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Server className="w-10 h-10" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight mb-2">
            No RouterOS Device Connected — Add Your Router to Begin
          </h2>
          <p className="text-sm text-[#8c97a8] max-w-xl mx-auto mb-6">
            In compliance with our <strong>Zero Mock Data Policy</strong>, all {tabTitle.toLowerCase()} originate live via the MikroTik RouterOS v7 REST API or socket protocol.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <button
              onClick={onOpenAddRouter}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.35)]"
            >
              <Plus className="w-4 h-4" />
              <span>Connect RouterOS v7 Device</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Quick Setup Instructions Box */}
          <div className="bg-[#0b0d12] border border-[#222733] rounded-lg p-5 text-left max-w-2xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#1f242e] pb-2 mb-3">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Quick 1-Minute MikroTik API Setup Commands
              </span>
              <span className="text-[10px] text-[#6b7280]">RouterOS v7.x Terminal</span>
            </div>

            <pre className="text-[11px] text-[#cbd5e1] leading-relaxed overflow-x-auto p-3 bg-[#08090d] rounded border border-[#1a1e27] font-mono select-all">
{`# 1. Enable secure HTTPS REST API (Port 443)
/ip service set www-ssl disabled=no port=443

# 2. Create constrained automation user group
/user group add name=toolkit_group policy=read,api,rest-api,test,password,sensitive

# 3. Add automation service user
/user add name=svc_toolkit group=toolkit_group password="YourSecurePasswordHere"`}
            </pre>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-[#788292]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>RouterOS v7.1+ Ready</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Hardware & CHR Cloud</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Encrypted at Rest</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
