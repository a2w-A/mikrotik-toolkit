import React, { useState } from "react";
import {
  X,
  Server,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Lock,
  Globe,
  Radio,
  Sliders,
  Play,
  ArrowRight,
} from "lucide-react";

interface RouterSetupModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onRouterAdded: (newRouter: any) => void;
}

export const RouterSetupModal: React.FC<RouterSetupModalProps> = ({
  token,
  isOpen,
  onClose,
  onRouterAdded,
}) => {
  const [name, setName] = useState("MikroTik-Edge-Router");
  const [host, setHost] = useState("192.168.88.1");
  const [port, setPort] = useState(443);
  const [protocol, setProtocol] = useState<"rest" | "api">("rest");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [verifySsl, setVerifySsl] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    identity?: string;
    firmware?: string;
    model?: string;
    latency_ms?: number;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProtocolChange = (newProto: "rest" | "api") => {
    setProtocol(newProto);
    if (newProto === "rest" && (port === 8728 || port === 8729)) {
      setPort(443);
    } else if (newProto === "api" && (port === 443 || port === 80)) {
      setPort(8729);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);

    try {
      const res = await fetch("/api/routers/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          host,
          port,
          protocol,
          username,
          password,
          verify_ssl: verifySsl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestResult({
          success: false,
          message: data.error || "Connection test failed.",
          latency_ms: data.latency_ms,
        });
      } else {
        setTestResult({
          success: true,
          message: data.message || "Connection verified successfully.",
          identity: data.identity,
          firmware: data.firmware,
          model: data.model,
          latency_ms: data.latency_ms,
        });
        if (data.identity && name === "MikroTik-Edge-Router") {
          setName(data.identity);
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while connecting to RouterOS device.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/routers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          host,
          port,
          protocol,
          username,
          password,
          verify_ssl: verifySsl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register router.");
      }

      onRouterAdded(data.router);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save router connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#141720] border border-[#2d333d] rounded-lg max-w-xl w-full p-6 shadow-2xl relative text-[#e1e4ea] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262b37] mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Router Connection Setup
              </h2>
              <p className="text-xs text-[#858d9d]">
                Connect a live RouterOS v7 hardware device or CHR instance
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

        {saveError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-4 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{saveError}</div>
          </div>
        )}

        <form onSubmit={handleSaveRouter} className="space-y-4">
          {/* Protocol Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1.5">
              API Connection Protocol
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProtocolChange("rest")}
                className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  protocol === "rest"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "bg-[#0d0f14] border-[#2d333d] text-[#858d9d] hover:border-[#3d4554]"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>REST API (HTTPS /rest/)</span>
              </button>
              <button
                type="button"
                onClick={() => handleProtocolChange("api")}
                className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  protocol === "api"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                    : "bg-[#0d0f14] border-[#2d333d] text-[#858d9d] hover:border-[#3d4554]"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>RouterOS Socket (8728/8729)</span>
              </button>
            </div>
          </div>

          {/* Device Label & Host */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                Device Label / Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0d0f14] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. Core-CCR2004-HQ"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                required
                className="w-full bg-[#0d0f14] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="443"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
              Router IP Address / FQDN Host
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              required
              className="w-full bg-[#0d0f14] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="192.168.88.1 or ros.example.com"
            />
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                API Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#0d0f14] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="admin or svc_toolkit"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                API Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0d0f14] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {/* SSL Toggle & Security Notice */}
          <div className="bg-[#0d0f14] border border-[#222733] rounded p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Verify SSL / TLS Certificates</span>
              <span className="text-[10px] text-[#717b8c] block">
                Disable if using RouterOS default self-signed SSL certificate
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={verifySsl}
                onChange={(e) => setVerifySsl(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#2d333d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Test Connection Output Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded border text-xs ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <div className="flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span>{testResult.success ? "Live Connection Verified" : "Connection Failed"}</span>
                </div>
                {testResult.latency_ms !== undefined && (
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono">
                    {testResult.latency_ms}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#cbd5e1]">{testResult.message}</p>
              {testResult.success && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 grid grid-cols-2 gap-1 text-[10px] text-white">
                  <div>Device: <strong className="text-emerald-300">{testResult.identity}</strong></div>
                  <div>Firmware: <strong className="text-emerald-300">{testResult.firmware}</strong></div>
                  <div>Model: <strong className="text-emerald-300">{testResult.model}</strong></div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#262b37] gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !host || !username || !password}
              className="py-2 px-4 rounded border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{testing ? "Testing Ping..." : "Test Connection"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 rounded text-xs text-[#858d9d] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !host || !username || !password}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)] disabled:opacity-50"
              >
                <span>{saving ? "Saving..." : "Save & Connect Router"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
