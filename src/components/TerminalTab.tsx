import React, { useState } from "react";
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { LiveRouterStatus } from "../types";
import { ZeroDataEmptyState } from "./ZeroDataEmptyState";

interface TerminalTabProps {
  status: LiveRouterStatus | null;
  token: string;
  onOpenAddRouter: () => void;
}

interface CommandLog {
  id: string;
  command: string;
  timestamp: string;
  output: string;
  status: "success" | "error";
  duration_ms: number;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  status,
  token,
  onOpenAddRouter,
}) => {
  const [command, setCommand] = useState("/system/resource/print");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CommandLog[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!status || !status.connected) {
    return (
      <ZeroDataEmptyState
        onOpenAddRouter={onOpenAddRouter}
        tabTitle="Interactive RouterOS Terminal"
      />
    );
  }

  const presets = [
    { label: "System Resource", cmd: "/system/resource/print" },
    { label: "IP Addresses", cmd: "/ip/address/print" },
    { label: "IP Services", cmd: "/ip/service/print" },
    { label: "Firewall Filters", cmd: "/ip/firewall/filter/print" },
    { label: "System Logs", cmd: "/log/print" },
    { label: "Active Interfaces", cmd: "/interface/print" },
  ];

  const handleExecute = async (cmdToRun?: string) => {
    const targetCmd = cmdToRun || command;
    if (!targetCmd.trim() || loading) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const res = await fetch("/api/routeros/terminal/exec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command: targetCmd }),
      });

      const data = await res.json();
      const duration_ms = Date.now() - startTime;

      const newLog: CommandLog = {
        id: Math.random().toString(36).substring(7),
        command: targetCmd,
        timestamp: new Date().toLocaleTimeString(),
        output: data.success
          ? typeof data.output === "object"
            ? JSON.stringify(data.output, null, 2)
            : String(data.output || "Done.")
          : data.error || "Command execution failed.",
        status: data.success ? "success" : "error",
        duration_ms,
      };

      setHistory((prev) => [newLog, ...prev]);
    } catch (err: any) {
      const duration_ms = Date.now() - startTime;
      setHistory((prev) => [
        {
          id: Math.random().toString(36).substring(7),
          command: targetCmd,
          timestamp: new Date().toLocaleTimeString(),
          output: err.message || "Network error while reaching RouterOS.",
          status: "error",
          duration_ms,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-[#e1e4ea]">
      {/* Command Input Area */}
      <div className="bg-[#141720] border border-[#262b37] rounded-lg p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#222733] mb-3">
          <div className="flex items-center space-x-2">
            <TerminalIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white">Live RouterOS v7 CLI Command Execution</span>
          </div>
          <span className="text-[11px] text-[#717b8c]">Target: {status.identity} ({status.host})</span>
        </div>

        {/* Presets Strip */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] uppercase font-bold text-[#717b8c] mr-1">Presets:</span>
          {presets.map((p) => (
            <button
              key={p.cmd}
              onClick={() => {
                setCommand(p.cmd);
                handleExecute(p.cmd);
              }}
              disabled={loading}
              className="py-1 px-2 rounded bg-[#0a0c10] hover:bg-[#1f2430] border border-[#1f242e] text-[10px] text-[#9aa3b2] hover:text-white transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-blue-400 font-bold text-xs select-none">
              &gt;
            </span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/ip/service/print or /system/resource/print"
              className="w-full bg-[#0a0c10] border border-[#2d333d] rounded pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !command.trim()}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? "Executing..." : "Execute"}</span>
          </button>
        </form>
      </div>

      {/* History Output Stream */}
      <div className="bg-[#141720] border border-[#262b37] rounded-lg overflow-hidden shadow-xl">
        <div className="px-4 py-2.5 border-b border-[#222733] flex items-center justify-between bg-[#12151c]">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Command Execution Log ({history.length})
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-[10px] text-[#717b8c] hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Log</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-[#1e232e] max-h-[500px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="py-12 text-center text-[#717b8c] text-xs">
              Execute a command or click a preset above to inspect live RouterOS v7 state.
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="p-3.5 hover:bg-[#161924] transition-colors">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-400">&gt; {item.command}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        item.status === "success"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#717b8c]">
                    <span>{item.duration_ms}ms</span>
                    <span>{item.timestamp}</span>
                    <button
                      onClick={() => handleCopy(item.output, item.id)}
                      className="text-blue-400 hover:text-blue-300 ml-1"
                      title="Copy Output"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <pre className="bg-[#0a0c10] border border-[#1f242e] rounded p-2.5 text-[11px] text-[#cbd5e1] max-h-60 overflow-y-auto overflow-x-auto select-all leading-relaxed">
                  {item.output}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
