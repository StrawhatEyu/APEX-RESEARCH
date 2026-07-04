import React, { useState } from "react";
import { supabase } from "../lib/supabase-service";
import { motion } from "motion/react";
import { X, Lock, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";

interface ResetPasswordModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ResetPasswordModal({ onClose, onSuccess }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) throw error;
      setSuccessMsg("Your security keycode has been updated successfully.");
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error("Failed to update password:", err);
      setErrorMsg(err.message || "Unable to update security passcode. Your reset link might have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070913]/92 backdrop-blur-lg flex justify-center items-center p-4" id="reset-password-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 24, stiffness: 180 }}
        className="relative w-full max-w-[430px] vibrant-glass rounded-[28px] p-6 md:p-8 shadow-2xl text-stone-200 overflow-hidden border border-white/5"
        id="reset-password-card"
      >
        {/* Glow ambient lights */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 text-stone-400 hover:text-stone-100 rounded-full border border-white/5 hover:bg-white/5 cursor-pointer transition-colors z-30"
          title="Dismiss portal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Branding header */}
        <div className="text-center mb-6 relative z-10">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-emerald-500 flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-500/10 border border-white/10">
            <KeyRound className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <h3 className="font-display font-black text-xl text-white tracking-tight uppercase">
            UPDATE SECURITY KEYCODE
          </h3>
          <p className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase mt-1">
            Secure Account Recovery Gateway
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {successMsg && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5 leading-relaxed font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/30 border border-rose-500/20 rounded-xl text-[10.5px] text-rose-300 leading-relaxed font-medium">
              {errorMsg}
            </div>
          )}

          {!successMsg && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] text-amber-300 font-cursive block">New Passcode</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-600" />
                  <input
                    type="password"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-black/20 hover:bg-black/40 focus:bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-amber-300 font-cursive block">Confirm Passcode</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-600" />
                  <input
                    type="password"
                    value={confirmPassword}
                    required
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new passcode"
                    className="w-full bg-black/20 hover:bg-black/40 focus:bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:opacity-95 text-white font-black text-xs rounded-xl py-3 cursor-pointer shadow-lg active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <span>{isLoading ? "Saving keycode..." : "Update Keycode"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-[10px] text-stone-500 hover:text-stone-300 transition-colors pt-2 block"
          >
            Dismiss Gateway
          </button>
        </form>
      </motion.div>
    </div>
  );
}
