import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LiveRouterStatus, AuditFinding } from "../types";
import { ZeroDataEmptyState } from "./ZeroDataEmptyState";

interface SecurityAuditTabProps {
  status: LiveRouterStatus | null;
  onOpenRemediation: () => void;
  onOpenScriptBuilder: () => void;
  onOpenAddRouter: () => void;
}

export const SecurityAuditTab: React.FC<SecurityAuditTabProps> = ({
  status,
  onOpenRemediation,
  onOpenScriptBuilder,
  onOpenAddRouter,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!status || !status.connected || !status.findings || status.findings.length === 0) {
    return (
      <ZeroDataEmptyState
        onOpenAddRouter={onOpenAddRouter}
        tabTitle="Security & Hardening Audit"
      />
    );
  }

  const findings = status.findings;
  const categories = Array.from(new Set(findings.map((f) => f.category)));

  const filteredFindings = findings.filter((f) => {
    const matchCat = filterCategory === "ALL" || f.category === filterCategory;
    const matchStatus = filterStatus === "ALL" || f.status === filterStatus;
    return matchCat && matchStatus;
  });

  const failCount = findings.filter((f) => f.status === "FAIL").length;
  const warnCount = findings.filter((f) => f.status === "WARN").length;
  const passCount = findings.filter((f) => f.status === "PASS").length;

  const handleCopyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-[#e1e4ea]">
      {/* Top Posture Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Score & Health Card */}
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 uppercase mb-2 border-b border-[#222733] pb-1">
              <span>Security Posture Score</span>
              <span>RouterOS v7</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span
                className={`text-3xl font-black ${
                  status.score >= 85
                    ? "text-emerald-400"
                    : status.score >= 60
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {status.score}
              </span>
              <span className="text-[#6b7280] text-xs font-semibold">/ 100</span>
            </div>
            <p className="text-xs text-[#9aa3b2] mt-1 font-semibold">{status.posture}</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e232e] text-[10px] text-[#717b8c]">
            Real-time live audit of connected node
          </div>
        </div>

        {/* Critical Issues */}
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-red-400 uppercase mb-2 border-b border-[#222733] pb-1">
              <span>Critical Vulnerabilities</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="text-3xl font-black text-red-400">{failCount}</div>
            <p className="text-xs text-[#9aa3b2] mt-1">High-risk exposure vectors</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e232e] text-[10px] text-red-400/80">
            Immediate remediation recommended
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase mb-2 border-b border-[#222733] pb-1">
              <span>Hardening Warnings</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="text-3xl font-black text-amber-400">{warnCount}</div>
            <p className="text-xs text-[#9aa3b2] mt-1">Sub-optimal configurations</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e232e] text-[10px] text-amber-400/80">
            Best-practice enhancements
          </div>
        </div>

        {/* Verified Hardened */}
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 uppercase mb-2 border-b border-[#222733] pb-1">
              <span>Hardened Controls</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-3xl font-black text-emerald-400">{passCount}</div>
            <p className="text-xs text-[#9aa3b2] mt-1">Active defense rules</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e232e] text-[10px] text-emerald-400/80">
            Compliant with CIS benchmarks
          </div>
        </div>
      </div>

      {/* Action Strip & Filter Controls */}
      <div className="bg-[#12151c] border border-[#262b37] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#717b8c] uppercase font-bold mr-1">Filter:</span>
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-[#0a0c10] p-1 rounded border border-[#1f242e] text-xs">
            {["ALL", "FAIL", "WARN", "PASS"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                  filterStatus === st
                    ? "bg-blue-600 text-white"
                    : "text-[#858d9d] hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0a0c10] border border-[#1f242e] rounded px-2.5 py-1 text-xs text-[#cbd5e1] focus:outline-none"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRemediation}
            className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>1-Click Remediation</span>
          </button>
          <button
            onClick={onOpenScriptBuilder}
            className="py-1.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Hardening .rsc</span>
          </button>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-[#141720] border border-[#262b37] rounded-lg overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-[#222733] flex items-center justify-between bg-[#12151c]">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Audit Checklist ({filteredFindings.length} Items)
          </span>
          <span className="text-[11px] text-[#717b8c]">Live RouterOS v7 Evaluation</span>
        </div>

        <div className="divide-y divide-[#1e232e]">
          {filteredFindings.map((finding, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div key={idx} className="p-4 hover:bg-[#161924] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {finding.status === "FAIL" && (
                        <div className="p-1 bg-red-500/10 border border-red-500/30 rounded text-red-400">
                          <XCircle className="w-4 h-4" />
                        </div>
                      )}
                      {finding.status === "WARN" && (
                        <div className="p-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {finding.status === "PASS" && (
                        <div className="p-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{finding.check}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0a0c10] border border-[#1f242e] text-[#858d9d] font-semibold">
                          {finding.category}
                        </span>
                        {finding.deduction > 0 && (
                          <span className="text-[10px] font-bold text-red-400">
                            -{finding.deduction} pts
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9aa3b2] leading-relaxed">{finding.details}</p>

                      {/* Remediation Snippet */}
                      {finding.remediation && (
                        <div className="mt-2.5 pt-2 border-t border-[#1e232e]">
                          <div className="flex items-center justify-between text-[10px] text-[#717b8c] font-bold uppercase mb-1">
                            <span className="flex items-center gap-1 text-blue-400">
                              <Terminal className="w-3 h-3" />
                              RouterOS v7 Remediation Command:
                            </span>
                            <button
                              onClick={() => handleCopyCmd(finding.remediation!, idx)}
                              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 normal-case font-mono"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Command</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="bg-[#0b0d12] border border-[#1f242e] rounded p-2.5 text-[11px] text-[#cbd5e1] overflow-x-auto select-all">
                            {finding.remediation}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
