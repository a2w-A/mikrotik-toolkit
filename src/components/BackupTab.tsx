import React, { useState } from "react";
import {
  Download,
  Shield,
  FileCode,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { LiveRouterStatus } from "../types";
import { ZeroDataEmptyState } from "./ZeroDataEmptyState";

interface BackupTabProps {
  status: LiveRouterStatus | null;
  token: string;
  onOpenAddRouter: () => void;
}

export const BackupTab: React.FC<BackupTabProps> = ({
  status,
  token,
  onOpenAddRouter,
}) => {
  const [backupPassword, setBackupPassword] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<{
    success: boolean;
    filename: string;
    message: string;
  } | null>(null);

  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    filename: string;
    script: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!status || !status.connected) {
    return (
      <ZeroDataEmptyState
        onOpenAddRouter={onOpenAddRouter}
        tabTitle="Backup & Configuration Export"
      />
    );
  }

  const handleCreateBinaryBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupLoading(true);
    setError(null);
    setBackupResult(null);

    try {
      const res = await fetch("/api/routeros/backup/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: backupPassword || undefined,
          encryption: "aes-256",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create binary backup.");
      }

      setBackupResult({
        success: true,
        filename: data.filename,
        message: data.message,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCreateExport = async () => {
    setExportLoading(true);
    setError(null);
    setExportResult(null);

    try {
      const res = await fetch("/api/routeros/export/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hideSensitive: true,
          sanitize: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate configuration export.");
      }

      setExportResult({
        success: true,
        filename: data.filename,
        script: data.script,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleCopyScript = () => {
    if (!exportResult?.script) return;
    navigator.clipboard.writeText(exportResult.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    if (!exportResult?.script) return;
    const blob = new Blob([exportResult.script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportResult.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-[#e1e4ea]">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Binary Backup Card */}
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 pb-3 border-b border-[#222733] mb-4">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Encrypted Binary Backup (.backup)</h3>
                <p className="text-[11px] text-[#858d9d]">Full state image suitable for bare-metal restore</p>
              </div>
            </div>

            <p className="text-xs text-[#9aa3b2] mb-4 leading-relaxed">
              Triggers <code className="text-blue-400">/system/backup/save</code> on <strong className="text-white">{status.identity}</strong>. Generates an encrypted snapshot of the entire RouterOS configuration including certificates, MAC tables, and users.
            </p>

            <form onSubmit={handleCreateBinaryBackup} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                  Backup Encryption Password (Recommended)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6b7280]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    placeholder="Enter backup encryption key..."
                    className="w-full bg-[#0d0f14] border border-[#2d333d] rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={backupLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
              >
                <HardDrive className="w-4 h-4" />
                <span>{backupLoading ? "Creating Encrypted Backup on Router..." : "Trigger Binary Backup"}</span>
              </button>
            </form>

            {backupResult && (
              <div className="mt-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Backup Created Successfully</span>
                </div>
                <p className="text-[11px] text-[#cbd5e1]">{backupResult.message}</p>
                <p className="text-[10px] text-[#717b8c] mt-1 font-mono">File: {backupResult.filename}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e232e] text-[10px] text-[#717b8c]">
            Encrypted with AES-256 on RouterOS v7 storage
          </div>
        </div>

        {/* Sanitized RSC Export Card */}
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 pb-3 border-b border-[#222733] mb-4">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sanitized Script Export (/export)</h3>
                <p className="text-[11px] text-[#858d9d]">Human-readable RouterOS CLI commands (.rsc)</p>
              </div>
            </div>

            <p className="text-xs text-[#9aa3b2] mb-4 leading-relaxed">
              Triggers <code className="text-emerald-400">/export hide-sensitive</code>. Strips plaintext credentials, IPsec keys, and private tokens for safe public auditing and Git version control.
            </p>

            <button
              onClick={handleCreateExport}
              disabled={exportLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <FileCode className="w-4 h-4" />
              <span>{exportLoading ? "Generating Sanitized Export..." : "Generate Sanitized /export"}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e232e] text-[10px] text-[#717b8c]">
            Zero credentials leaked • Ready for Git commits
          </div>
        </div>
      </div>

      {/* Export Viewer Box (if generated) */}
      {exportResult && (
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#222733] mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">{exportResult.filename}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyScript}
                className="py-1 px-2.5 bg-[#181c26] hover:bg-[#222733] border border-[#2d333d] text-xs text-[#cbd5e1] rounded flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleDownloadScript}
                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .rsc</span>
              </button>
            </div>
          </div>

          <pre className="bg-[#0b0d12] border border-[#1f242e] rounded p-3 text-xs text-[#cbd5e1] max-h-80 overflow-y-auto overflow-x-auto select-all leading-relaxed">
            {exportResult.script}
          </pre>
        </div>
      )}
    </div>
  );
};
