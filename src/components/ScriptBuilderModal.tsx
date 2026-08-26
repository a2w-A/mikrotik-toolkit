import React, { useState } from "react";
import {
  X,
  Sliders,
  Download,
  Copy,
  Check,
  FileCode,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { LiveRouterStatus } from "../types";

interface ScriptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LiveRouterStatus | null;
}

export const ScriptBuilderModal: React.FC<ScriptBuilderModalProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  const [disableInsecureServices, setDisableInsecureServices] = useState(true);
  const [hardenDns, setHardenDns] = useState(true);
  const [isolateNeighborDiscovery, setIsolateNeighborDiscovery] = useState(true);
  const [addIcmpRateLimits, setAddIcmpRateLimits] = useState(true);
  const [addFasttrack, setAddFasttrack] = useState(true);
  const [dropInvalidPackets, setDropInvalidPackets] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateScript = () => {
    const lines: string[] = [
      "# ===================================================================",
      "# MikroTik RouterOS v7 Production Hardening Script (.rsc)",
      "# Generated via mikrotik-toolkit — Algo2World (https://algo2world.com)",
      `# Target Identity: ${status?.identity || "MikroTik-Router"}`,
      `# Target Host: ${status?.host || "192.168.88.1"}`,
      "# ===================================================================",
      "",
    ];

    if (disableInsecureServices) {
      lines.push("# 1. Disable Plaintext & Insecure Management Services");
      lines.push("/ip service set telnet disabled=yes");
      lines.push("/ip service set ftp disabled=yes");
      lines.push("/ip service set www disabled=yes");
      lines.push("/ip service set api disabled=yes");
      lines.push("/ip service set api-ssl disabled=no port=8729");
      lines.push("/ip service set www-ssl disabled=no port=443");
      lines.push("");
    }

    if (hardenDns) {
      lines.push("# 2. Block External DNS Amplification & Recursive Queries");
      lines.push("/ip dns set allow-remote-requests=no");
      lines.push("");
    }

    if (isolateNeighborDiscovery) {
      lines.push("# 3. Restrict MNDP/CDP Neighbor Discovery to LAN");
      lines.push("/ip neighbor discovery-settings set discover-interface-list=LAN");
      lines.push("");
    }

    if (dropInvalidPackets) {
      lines.push("# 4. Firewall Defense: Drop Invalid Connection States");
      lines.push(
        '/ip firewall filter add chain=input connection-state=invalid action=drop comment="Drop Invalid Input Packets"'
      );
      lines.push(
        '/ip firewall filter add chain=forward connection-state=invalid action=drop comment="Drop Invalid Forward Packets"'
      );
      lines.push("");
    }

    if (addIcmpRateLimits) {
      lines.push("# 5. Firewall Defense: ICMP Echo Rate Limiting (Anti-Ping Flood)");
      lines.push(
        '/ip firewall filter add chain=input protocol=icmp limit=50/5s,5:packet action=accept comment="Allow limited ICMP ping"'
      );
      lines.push(
        '/ip firewall filter add chain=input protocol=icmp action=drop comment="Drop excessive ICMP flood"'
      );
      lines.push("");
    }

    if (addFasttrack) {
      lines.push("# 6. High-Throughput Performance: FastTrack Forwarding");
      lines.push(
        '/ip firewall filter add chain=forward action=fasttrack-connection connection-state=established,related comment="FastTrack Established/Related"'
      );
      lines.push(
        '/ip firewall filter add chain=forward action=accept connection-state=established,related comment="Accept Established/Related"'
      );
      lines.push("");
    }

    lines.push("# 7. Final Security Verification Check");
    lines.push("/system/resource/print");
    lines.push("/ip/service/print");

    return lines.join("\n");
  };

  const scriptContent = generateScript();

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hardening_${status?.identity || "router"}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#141720] border border-[#2d333d] rounded-lg max-w-3xl w-full p-6 shadow-2xl relative text-[#e1e4ea] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262b37] mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                RouterOS v7 Hardening Script Customizer (.rsc)
              </h2>
              <p className="text-xs text-[#858d9d]">
                Toggle defense modules and compile custom RouterOS automation scripts
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

        {/* Modular Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          <label className="flex items-center space-x-2.5 bg-[#0d0f14] border border-[#222733] p-2.5 rounded cursor-pointer hover:border-blue-500/40 transition-colors">
            <input
              type="checkbox"
              checked={disableInsecureServices}
              onChange={(e) => setDisableInsecureServices(e.target.checked)}
              className="rounded bg-[#1a1e27] border-[#2d333d] text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-white">Disable Telnet, FTP, HTTP, Plaintext API</span>
          </label>

          <label className="flex items-center space-x-2.5 bg-[#0d0f14] border border-[#222733] p-2.5 rounded cursor-pointer hover:border-blue-500/40 transition-colors">
            <input
              type="checkbox"
              checked={hardenDns}
              onChange={(e) => setHardenDns(e.target.checked)}
              className="rounded bg-[#1a1e27] border-[#2d333d] text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-white">Block DNS Remote Requests (Anti-Amplification)</span>
          </label>

          <label className="flex items-center space-x-2.5 bg-[#0d0f14] border border-[#222733] p-2.5 rounded cursor-pointer hover:border-blue-500/40 transition-colors">
            <input
              type="checkbox"
              checked={isolateNeighborDiscovery}
              onChange={(e) => setIsolateNeighborDiscovery(e.target.checked)}
              className="rounded bg-[#1a1e27] border-[#2d333d] text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-white">Isolate MNDP Discovery to LAN Only</span>
          </label>

          <label className="flex items-center space-x-2.5 bg-[#0d0f14] border border-[#222733] p-2.5 rounded cursor-pointer hover:border-blue-500/40 transition-colors">
            <input
              type="checkbox"
              checked={dropInvalidPackets}
              onChange={(e) => setDropInvalidPackets(e.target.checked)}
              className="rounded bg-[#1a1e27] border-[#2d333d] text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-white">Drop Invalid State Firewall Packets</span>
          </label>

          <label className="flex items-center space-x-2.5 bg-[#0d0f14] border border-[#222733] p-2.5 rounded cursor-pointer hover:border-blue-500/40 transition-colors">
            <input
              type="checkbox"
              checked={addIcmpRateLimits}
              onChange={(e) => setAddIcmpRateLimits(e.target.checked)}
              className="rounded bg-[#1a1e27] border-[#2d333d] text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-white">ICMP Ping Flood Rate Limiting</span>
          </label>

          <label className="flex items-center space-x-2.5 bg-[#0d0f14] border border-[#222733] p-2.5 rounded cursor-pointer hover:border-blue-500/40 transition-colors">
            <input
              type="checkbox"
              checked={addFasttrack}
              onChange={(e) => setAddFasttrack(e.target.checked)}
              className="rounded bg-[#1a1e27] border-[#2d333d] text-blue-600 focus:ring-0"
            />
            <span className="text-xs text-white">Enable Hardware FastTrack Connection State</span>
          </label>
        </div>

        {/* Script Output Area */}
        <div className="flex-1 bg-[#0b0d12] border border-[#1f242e] rounded-lg p-3 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1e27] mb-2 text-xs">
            <span className="text-blue-400 font-bold flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              Live Generated RouterOS .rsc Script
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="py-1 px-2.5 bg-[#181c26] hover:bg-[#222733] border border-[#2d333d] text-xs text-[#cbd5e1] rounded flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleDownload}
                className="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
              >
                <Download className="w-3 h-3" />
                <span>Download .rsc</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 overflow-y-auto text-xs text-[#cbd5e1] select-all leading-relaxed font-mono">
            {scriptContent}
          </pre>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#262b37] mt-3 flex justify-end">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-[#181c26] hover:bg-[#222733] border border-[#2d333d] rounded text-xs text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
