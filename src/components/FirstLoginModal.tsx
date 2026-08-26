import React, { useState } from "react";
import { ShieldAlert, Lock, Check, X, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

interface FirstLoginModalProps {
  token: string;
  onPasswordChanged: (updatedUser: any) => void;
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({ token, onPasswordChanged }) => {
  const [currentPassword, setCurrentPassword] = useState("ChangeMe@RouterOS2026!");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time password complexity validators
  const hasMinLength = newPassword.length >= 10;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const notDefault = newPassword !== "ChangeMe@RouterOS2026!" && newPassword.length > 0;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    notDefault &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-initial-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password.");
      }

      onPasswordChanged(data.user);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#141720] border-2 border-red-500/50 rounded-lg max-w-lg w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden text-[#e1e4ea]">
        {/* Top Warning Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse"></div>

        <div className="flex items-start gap-3.5 mb-5 pb-4 border-b border-[#262b37]">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Security Notice: Initial Password Change Required
              </h2>
            </div>
            <p className="text-xs text-[#9aa3b2] mt-1">
              Your account is currently using the default temporary provisioning credentials. In accordance with zero-trust network standards, you must set an enterprise-grade password before accessing the dashboard.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-4 text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
              Current Temporary Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-[#0b0d12] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
              placeholder="Enter current temporary password"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                New Enterprise Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-[#0b0d12] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Min 10 characters"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#0b0d12] border border-[#2d333d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Re-type new password"
              />
            </div>
          </div>

          {/* Real-time Password Complexity Standards */}
          <div className="bg-[#0b0d12] border border-[#222834] rounded-lg p-3.5 space-y-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-[#717b8c] tracking-wider block mb-1">
              Password Complexity Verification:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-[#717b8c]"}`}>
                {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Minimum 10 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-400" : "text-[#717b8c]"}`}>
                {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-400" : "text-[#717b8c]"}`}>
                {hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-[#717b8c]"}`}>
                {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Numeric digit (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-400" : "text-[#717b8c]"}`}>
                {hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Special symbol (!@#$%^&*)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-400" : "text-[#717b8c]"}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-[#262c37] disabled:text-[#6b7280] text-white font-bold py-2.5 px-4 rounded text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:shadow-none"
          >
            {loading ? (
              <span>Updating Credentials & Hashing...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save New Password & Unlock Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
