import React, { useState, useEffect } from "react";
import {
  Wifi,
  Activity,
  Clock,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowDown,
  ArrowUp,
  Key,
} from "lucide-react";
import { LiveRouterStatus, WireGuardPeer } from "../types";
import { ZeroDataEmptyState } from "./ZeroDataEmptyState";

interface WireGuardTabProps {
  status: LiveRouterStatus | null;
  token: string;
  onOpenAddRouter: () => void;
}

export const WireGuardTab: React.FC<WireGuardTabProps> = ({
  status,
  token,
  onOpenAddRouter,
}) => {
  const [peers, setPeers] = useState<WireGuardPeer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pruning, setPruning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPeers = async () => {
    if (!status?.connected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/routeros/wireguard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch WireGuard peers.");
      }
      setPeers(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status?.connected) {
      fetchPeers();
    }
  }, [status?.connected, status?.host]);

  if (!status || !status.connected) {
    return (
      <ZeroDataEmptyState
        onOpenAddRouter={onOpenAddRouter}
        tabTitle="WireGuard VPN Peer Telemetry"
      />
    );
  }

  const handlePruneStale = async () => {
    setPruning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/routeros/wireguard/prune-stale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ daysThreshold: 7 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to prune stale peers.");
      }

      setSuccessMessage(data.message || "Stale peers pruned successfully.");
      fetchPeers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPruning(false);
    }
  };

  const activePeers = peers.filter((p) => !p.is_stale).length;
  const stalePeers = peers.filter((p) => p.is_stale).length;

  return (
    <div className="space-y-4 font-mono text-[#e1e4ea]">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 shadow">
          <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">Configured Peers</div>
          <div className="text-2xl font-bold text-white">{peers.length}</div>
          <p className="text-xs text-[#717b8c] mt-1">Queried from /interface/wireguard/peers</p>
        </div>

        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 shadow">
          <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Active Handshakes</div>
          <div className="text-2xl font-bold text-emerald-400">{activePeers}</div>
          <p className="text-xs text-[#717b8c] mt-1">Live encrypted tunnels</p>
        </div>

        <div className="bg-[#141720] border border-[#262b37] rounded-lg p-3.5 shadow">
          <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">Stale / Dormant Peers</div>
          <div className="text-2xl font-bold text-amber-400">{stalePeers}</div>
          <p className="text-xs text-[#717b8c] mt-1">No handshake &gt; 7 days</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPeers} className="underline text-xs">Retry</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="bg-[#12151c] border border-[#262b37] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow">
        <div className="text-xs text-[#858d9d]">
          Monitoring WireGuard interface instances on <strong className="text-white">{status.identity}</strong>
        </div>

        <div className="flex items-center gap-2">
          {stalePeers > 0 && (
            <button
              onClick={handlePruneStale}
              disabled={pruning}
              className="py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{pruning ? "Pruning..." : "Prune Stale Peers (>7d)"}</span>
            </button>
          )}

          <button
            onClick={fetchPeers}
            disabled={loading}
            className="py-1.5 px-3 bg-[#181c26] hover:bg-[#222733] border border-[#2d333d] text-[#858d9d] hover:text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Refresh Peers</span>
          </button>
        </div>
      </div>

      {/* Peers Table */}
      <div className="bg-[#141720] border border-[#262b37] rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0f1118] border-b border-[#222733] text-[#717b8c] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Public Key</th>
                <th className="px-4 py-3">Allowed Address</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Last Handshake</th>
                <th className="px-4 py-3">Traffic (TX / RX)</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e232e]">
              {peers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#717b8c]">
                    {loading ? "Querying RouterOS WireGuard peer table..." : "No WireGuard peers configured on this router."}
                  </td>
                </tr>
              ) : (
                peers.map((peer) => (
                  <tr key={peer.id} className="hover:bg-[#161924] transition-colors">
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate max-w-[140px]">{peer.public_key}</span>
                    </td>
                    <td className="px-4 py-3 text-[#cbd5e1] font-semibold">{peer.allowed_address}</td>
                    <td className="px-4 py-3 text-[#9aa3b2]">{peer.endpoint || "Roaming / Dynamic"}</td>
                    <td className="px-4 py-3 text-[#717b8c] text-[11px]">{peer.last_handshake}</td>
                    <td className="px-4 py-3 text-[#9aa3b2] text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <ArrowDown className="w-3 h-3" /> {peer.rx_human}
                        </span>
                        <span className="text-blue-400 flex items-center gap-0.5">
                          <ArrowUp className="w-3 h-3" /> {peer.tx_human}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {peer.is_stale ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          STALE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          ONLINE
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
