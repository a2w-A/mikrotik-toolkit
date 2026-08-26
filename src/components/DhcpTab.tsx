import React, { useState, useEffect } from "react";
import {
  Network,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowRight,
  Sliders,
  ShieldCheck,
  Laptop,
} from "lucide-react";
import { DhcpLease, LiveRouterStatus } from "../types";
import { ZeroDataEmptyState } from "./ZeroDataEmptyState";

interface DhcpTabProps {
  status: LiveRouterStatus | null;
  token: string;
  onOpenAddRouter: () => void;
}

export const DhcpTab: React.FC<DhcpTabProps> = ({ status, token, onOpenAddRouter }) => {
  const [leases, setLeases] = useState<DhcpLease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchLeases = async () => {
    if (!status?.connected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/routeros/dhcp", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch live DHCP leases.");
      }
      setLeases(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status?.connected) {
      fetchLeases();
    }
  }, [status?.connected, status?.host]);

  if (!status || !status.connected) {
    return (
      <ZeroDataEmptyState
        onOpenAddRouter={onOpenAddRouter}
        tabTitle="DHCP Leases & Static Reservations"
      />
    );
  }

  const handleMakeStatic = async (lease: DhcpLease) => {
    setProcessingId(lease.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/routeros/dhcp/make-static", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaseId: lease.id,
          comment: `Static reservation for ${lease.host} via mikrotik-toolkit`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to convert lease to static.");
      }

      setSuccessMessage(`Converted lease for ${lease.address} (${lease.host}) to static reservation.`);
      fetchLeases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredLeases = leases.filter(
    (l) =>
      l.address.toLowerCase().includes(search.toLowerCase()) ||
      l.mac.toLowerCase().includes(search.toLowerCase()) ||
      l.host.toLowerCase().includes(search.toLowerCase())
  );

  const dynamicCount = leases.filter((l) => l.dynamic).length;
  const staticCount = leases.filter((l) => !l.dynamic).length;

  return (
    <div className="space-y-4 font-mono text-[#e1e4ea]">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 shadow">
          <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">Total Active Leases</div>
          <div className="text-2xl font-bold text-white">{leases.length}</div>
          <p className="text-xs text-[#717b8c] mt-1">Live queried from /ip/dhcp-server/lease</p>
        </div>

        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 shadow">
          <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">Dynamic Leases</div>
          <div className="text-2xl font-bold text-amber-400">{dynamicCount}</div>
          <p className="text-xs text-[#717b8c] mt-1">Temporary addresses subject to expiry</p>
        </div>

        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 shadow">
          <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Static Reservations</div>
          <div className="text-2xl font-bold text-emerald-400">{staticCount}</div>
          <p className="text-xs text-[#717b8c] mt-1">Permanent MAC-to-IP bindings</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchLeases} className="underline text-xs">Retry</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Table Header Controls */}
      <div className="bg-[#12151c] border border-[#262b37] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6b7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by IP, MAC, or Hostname..."
            className="w-full bg-[#0a0c10] border border-[#1f242e] rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeases}
            disabled={loading}
            className="py-1.5 px-3 bg-[#181c26] hover:bg-[#222733] border border-[#2d333d] text-[#858d9d] hover:text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Refresh Leases</span>
          </button>
        </div>
      </div>

      {/* Leases Table */}
      <div className="bg-[#141720] border border-[#262b37] rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0f1118] border-b border-[#222733] text-[#717b8c] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">MAC Address</th>
                <th className="px-4 py-3">Hostname / Identifier</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e232e]">
              {filteredLeases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#717b8c]">
                    {loading ? "Querying live RouterOS DHCP table..." : "No DHCP leases found matching search."}
                  </td>
                </tr>
              ) : (
                filteredLeases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-[#161924] transition-colors">
                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                      <Laptop className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{lease.address}</span>
                    </td>
                    <td className="px-4 py-3 text-[#9aa3b2]">{lease.mac}</td>
                    <td className="px-4 py-3 text-white font-medium">{lease.host || "Unknown Host"}</td>
                    <td className="px-4 py-3">
                      {lease.dynamic ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          DYNAMIC
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          STATIC
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[#cbd5e1] capitalize">{lease.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[#717b8c] text-[11px]">{lease.expires}</td>
                    <td className="px-4 py-3 text-right">
                      {lease.dynamic ? (
                        <button
                          onClick={() => handleMakeStatic(lease)}
                          disabled={processingId === lease.id}
                          className="py-1 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{processingId === lease.id ? "Binding..." : "Make Static"}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-400/70 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Reserved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
