import React, { useState } from "react";
import { Shield, Lock, User, AlertCircle, ArrowRight, Server, KeyRound, CheckCircle2 } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any, requiresPasswordChange: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("ChangeMe@RouterOS2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed.");
      }

      onLoginSuccess(data.token, data.user, data.requiresPasswordChange);
    } catch (err: any) {
      setError(err.message || "Unable to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] flex flex-col justify-between font-mono text-[#e1e4ea] selection:bg-blue-600 selection:text-white">
      {/* Top Brand Bar */}
      <header className="border-b border-[#1f242e] bg-[#12151c]/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="https://avatars.githubusercontent.com/u/34476702?v=4"
            alt="mikrotik-toolkit logo"
            className="w-8 h-8 rounded border border-blue-500/40 object-cover shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">mikrotik-toolkit</span>
              <span className="text-[10px] uppercase font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                v7 Enterprise
              </span>
            </div>
            <p className="text-[11px] text-[#858d9d]">RouterOS v7 Automation, Auditing & Defense Platform</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-4 text-xs text-[#9ca3af]">
          <span>Developed by <a href="https://algo2world.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold">Algo2World</a></span>
          <span className="text-[#2d333d]">|</span>
          <span>Zero-Mock Policy: <strong className="text-emerald-400">Live RouterOS Only</strong></span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-[#161922] border border-[#262c38] rounded-lg p-6 shadow-2xl relative overflow-hidden">
          {/* Accent top line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400"></div>

          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 mb-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Enterprise Authentication</h2>
            <p className="text-xs text-[#8e98a8] mt-1">
              Sign in to manage, audit, and secure your MikroTik infrastructure
            </p>
          </div>

          {/* Default Credentials Notice Callout */}
          <div className="bg-[#12151e] border border-blue-500/30 rounded p-3 mb-5 text-[11px]">
            <div className="flex items-start gap-2 text-blue-400 font-bold mb-1">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Initial Provisioning Credentials:</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[#9ca3af] bg-[#0c0e13] p-2 rounded border border-[#222834]">
              <div>Username: <span className="text-white font-semibold">admin</span></div>
              <div className="truncate">Password: <span className="text-white font-semibold">ChangeMe@...</span></div>
            </div>
            <p className="text-[10px] text-[#6b7280] mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
              Mandatory password change will be enforced immediately upon first authentication.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-4 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6b7280]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-[#0d0f14] border border-[#2d333d] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6b7280]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#0d0f14] border border-[#2d333d] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with DB...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Features Checkpoints */}
          <div className="mt-6 pt-4 border-t border-[#222733] grid grid-cols-2 gap-2 text-[10px] text-[#717b8c]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>PBKDF2 Password Hash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>RouterOS v7 Native</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zero-Mock Integrity</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1e27] bg-[#0c0e13] py-4 px-6 text-center text-xs text-[#626c7d]">
        <p>
          mikrotik-toolkit is an open-source initiative by <a href="https://algo2world.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Algo2World</a> • Part of the Ind. Sovereign Ecosystem
        </p>
      </footer>
    </div>
  );
};
