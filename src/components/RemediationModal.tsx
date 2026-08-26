import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { LiveRouterStatus, AuditFinding } from "../types";

interface RemediationModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LiveRouterStatus | null;
  token: string;
  onRemediated: () => void;
}

export const RemediationModal: React.FC<RemediationModalProps> = ({
  isOpen,
  onClose,
  status,
  token,
  onRemediated,
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    output?: any;
  } | null>(null);

  if (!isOpen || !status) return null;

  const actionableFindings = status.findings.filter(
    (f) => (f.status === "FAIL" || f.status === "WARN") && f.remediation
  );

  const combinedScript = actionableFindings
    .map((f) => `# [${f.category}] ${f.check}\n${f.remediation}`)
    .join("\n\n");

  const handleApplyRemediation = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/routeros/audit/remediate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          safeOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Remediation execution failed.");
      }

      setResult({
        success: true,
        message: data.message || "Safe CIS hardening rules applied successfully.",
        output: data.output,
      });

      onRemediated();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Failed to execute hardening script on RouterOS.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(combinedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#141720] border border-[#2d333d] rounded-lg max-w-2xl w-full p-6 shadow-2xl relative text-[#e1e4ea] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262b37] mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                1-Click Automated CIS Hardening
              </h2>
              <p className="text-xs text-[#858d9d]">
                Target: {status.identity} ({status.host})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#858d9d] hover:text-white p-1 rounded hover:bg-[#222733] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          <p className="text-xs text-[#9aa3b2] leading-relaxed">
            The following hardening commands have been compiled to resolve detected vulnerabilities on your RouterOS device. You can execute them live via the REST API or copy them to run manually in the RouterOS terminal.
          </p>

          {/* Actionable Rules Preview */}
          <div className="bg-[#0b0d12] border border-[#1f242e] rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a1e27] mb-2">
              <span className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Compiled Hardening Commands ({actionableFindings.length} rules)
              </span>
              <button
                onClick={handleCopyScript}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy All"}</span>
              </button>
            </div>

            <pre className="text-[11px] text-[#cbd5e1] max-h-52 overflow-y-auto select-all leading-relaxed">
              {combinedScript || "# No critical remediation needed. Router is hardened."}
            </pre>
          </div>

          {result && (
            <div
              className={`p-3.5 rounded border text-xs ${
                result.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {result.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{result.success ? "Remediation Executed" : "Remediation Error"}</span>
              </div>
              <p className="text-[11px] text-[#cbd5e1]">{result.message}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#262b37] mt-4">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded text-xs text-[#858d9d] hover:text-white"
          >
            Close
          </button>

          <button
            onClick={handleApplyRemediation}
            disabled={loading || actionableFindings.length === 0}
            className="py-2 px-5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? "Applying Hardening Rules..." : "Execute Safe Remediation"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
