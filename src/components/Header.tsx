import React from "react";
import {
  Shield,
  Server,
  Activity,
  Cpu,
  RefreshCw,
  Download,
  Terminal,
  FileCode,
  Wifi,
  Network,
  LogOut,
  Sliders,
  Plus,
  ChevronDown,
  Layers,
} from "lucide-react";
import { LiveRouterStatus, RouterConnection } from "../types";

interface HeaderProps {
  status: LiveRouterStatus | null;
  routers: RouterConnection[];
  activeRouterId: string | null;
  onSelectRouter: (id: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenRemediation: () => void;
  onOpenScriptBuilder: () => void;
  onOpenAddRouter: () => void;
  onOpenRouterManager: () => void;
  onLogout: () => void;
  username: string;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  routers,
  activeRouterId,
  onSelectRouter,
  onRefresh,
  isRefreshing,
  activeTab,
  setActiveTab,
  onOpenRemediation,
  onOpenScriptBuilder,
  onOpenAddRouter,
  onOpenRouterManager,
  onLogout,
  username,
}) => {
  const isConnected = Boolean(status?.connected && status?.host);
  const activeRouter = routers.find((r) => r.id === activeRouterId) || routers[0];

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", grade: "Grade A (Hardened)" };
    if (score >= 75) return { bg: "bg-blue-500/10 text-blue-400 border-blue-500/30", grade: "Grade B (Moderate)" };
    if (score >= 55) return { bg: "bg-amber-500/10 text-amber-400 border-amber-500/30", grade: "Grade C (Vulnerable)" };
    return { bg: "bg-red-500/10 text-red-400 border-red-500/30", grade: "Grade F (Critical Risk)" };
  };

  const badge = getScoreBadge(status?.score || 0);

  return (
    <header id="main-header" className="bg-[#12151c] border-b border-[#222733] sticky top-0 z-30 font-mono text-[#e1e4ea]">
      {/* Top Banner / High Density Device Target Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <img
            src="https://avatars.githubusercontent.com/u/34476702?v=4"
            alt="mikrotik-toolkit logo"
            className="w-7 h-7 rounded border border-blue-500/40 object-cover shadow-[0_0_10px_rgba(59,130,246,0.3)] shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                mikrotik-toolkit
                <span className="text-[#717b8c] font-normal text-xs">v7-enterprise</span>
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold">
                Zero-Mock
              </span>
            </div>
          </div>
        </div>

        {/* High Density Status Readout */}
        <div className="hidden lg:flex items-center gap-4 text-[10px] uppercase tracking-wider text-[#9ca3af]">
          {isConnected ? (
            <>
              <span>Target: <strong className="text-white">{status?.identity || activeRouter?.name}</strong></span>
              <span>Host: <strong className="text-blue-400">{status?.host || activeRouter?.host}</strong></span>
              <span>Uptime: <strong className="text-white">{status?.uptime || "N/A"}</strong></span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </span>
            </>
          ) : (
            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-bold">
              NO ROUTEROS DEVICE CONNECTED
            </span>
          )}
        </div>

        {/* Target Profile Switcher & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {routers.length > 0 ? (
            <div className="flex items-center bg-[#0a0c10] rounded border border-[#262b37] px-2 py-1">
              <span className="text-[10px] text-[#717b8c] uppercase tracking-wider font-semibold mr-1.5">
                Target:
              </span>
              <select
                id="router-target-select"
                value={activeRouterId || ""}
                onChange={(e) => onSelectRouter(e.target.value)}
                aria-label="Select target RouterOS instance"
                className="bg-transparent text-xs text-blue-400 font-semibold focus:outline-none cursor-pointer pr-2"
              >
                {routers.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#141720] text-white">
                    {r.name} ({r.host})
                  </option>
                ))}
              </select>
              <button
                onClick={onOpenRouterManager}
                title="Manage Router Connections"
                className="ml-1 text-[#717b8c] hover:text-white p-0.5"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAddRouter}
              className="py-1 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Router</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            id="refresh-profile-btn"
            onClick={onRefresh}
            disabled={isRefreshing || !isConnected}
            title="Refresh Live Metrics from RouterOS"
            className="p-1.5 rounded bg-[#181c26] hover:bg-[#222733] border border-[#2d333d] text-[#858d9d] hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#262b37]">
            <span className="text-[11px] text-[#9ca3af] hidden sm:inline">{username}</span>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-[#717b8c] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Strip (Only visible when connected) */}
      {isConnected && (
        <div className="border-t border-[#1e232e] bg-[#0d0f14] px-3 sm:px-4 lg:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-[#858d9d]">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Identity: <strong className="text-white">{status?.identity}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>CPU: <strong className="text-white">{status?.cpu_load}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>RAM Free: <strong className="text-white">{status?.memory_free}</strong></span>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                <span>Model: <strong className="text-white">{status?.model}</strong></span>
              </div>
              <div className="hidden lg:flex items-center gap-1.5">
                <span>Firmware: <strong className="text-emerald-400">{status?.version}</strong></span>
              </div>
            </div>

            {/* Posture Score Pill */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                Score: {status?.score}/100 • {badge.grade}
              </span>
              <button
                id="btn-remediate"
                onClick={onOpenRemediation}
                className="py-1 px-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <Shield className="w-3 h-3" />
                <span>1-Click Hardening</span>
              </button>
              <button
                id="btn-script-builder"
                onClick={onOpenScriptBuilder}
                className="py-1 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <Sliders className="w-3 h-3" />
                <span>Script Builder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-t border-[#1e232e] bg-[#12151c] px-3 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1">
          <button
            id="tab-security-audit"
            onClick={() => setActiveTab("audit")}
            className={`py-2 px-3 text-xs font-semibold rounded flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === "audit"
                ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "text-[#858d9d] hover:text-white hover:bg-[#181c26]"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security & Hardening Audit</span>
          </button>

          <button
            id="tab-dhcp-leases"
            onClick={() => setActiveTab("dhcp")}
            className={`py-2 px-3 text-xs font-semibold rounded flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === "dhcp"
                ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "text-[#858d9d] hover:text-white hover:bg-[#181c26]"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>DHCP & Static Leases</span>
          </button>

          <button
            id="tab-wireguard-vpn"
            onClick={() => setActiveTab("wireguard")}
            className={`py-2 px-3 text-xs font-semibold rounded flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === "wireguard"
                ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "text-[#858d9d] hover:text-white hover:bg-[#181c26]"
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>WireGuard VPN Monitor</span>
          </button>

          <button
            id="tab-backup-export"
            onClick={() => setActiveTab("backup")}
            className={`py-2 px-3 text-xs font-semibold rounded flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === "backup"
                ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "text-[#858d9d] hover:text-white hover:bg-[#181c26]"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup & Safe /export</span>
          </button>

          <button
            id="tab-live-terminal"
            onClick={() => setActiveTab("terminal")}
            className={`py-2 px-3 text-xs font-semibold rounded flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === "terminal"
                ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "text-[#858d9d] hover:text-white hover:bg-[#181c26]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Terminal Runner</span>
          </button>

          <button
            id="tab-python-code"
            onClick={() => setActiveTab("code")}
            className={`py-2 px-3 text-xs font-semibold rounded flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === "code"
                ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "text-[#858d9d] hover:text-white hover:bg-[#181c26]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Python CLI Source Code</span>
          </button>
        </div>
      </div>
    </header>
  );
};
