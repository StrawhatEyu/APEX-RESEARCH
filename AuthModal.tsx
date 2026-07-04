import React, { useState } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseActive, getAuthMode, setAuthMode, hasSupabaseConfigured } from "../lib/supabase-service";
import { X, Sparkles, ShieldCheck, ArrowRight, Mail, Lock, RefreshCw, ArrowLeft, KeyRound } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialTab?: "signin" | "signup";
  message?: string;
}

export default function AuthModal({ onClose, onSuccess, initialTab = "signin", message }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email verification flow for Sign Up
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Forgotten password states
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Custom Supabase override states
  const [isCustomSettingsOpen, setIsCustomSettingsOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("custom-supabase-url") || "" : ""));
  const [customKey, setCustomKey] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("custom-supabase-key") || "" : ""));
  const hasCustomSupabase = typeof window !== "undefined" && !!(localStorage.getItem("custom-supabase-url") && localStorage.getItem("custom-supabase-key"));

  // Help format any authentication/connection errors into clean, descriptive strings
  const formatError = (err: any): string => {
    if (!err) return "An unknown authentication error occurred.";
    if (typeof err === "string") return err;
    
    // Check for standard Supabase AuthRetryableFetchError or status 500 SMTP failures
    if (
      err.name === "AuthRetryableFetchError" || 
      err.message === "{}" || 
      err.status === 500 ||
      (err.message && err.message.includes("confirmation email"))
    ) {
      return "Supabase SMTP Server Error (500): The authentication service failed to send a registration confirmation email because the shared project's free-tier SMTP email limit has been completely exhausted. Since email confirmation is required by this Supabase instance, new accounts cannot be registered right now on this shared database. To bypass this, please enter your own custom Supabase project credentials in the configuration panel below (with confirmation emails disabled), or sign in if your account is already active!";
    }
    
    // Check if the message property exists
    if (err.message) {
      if (typeof err.message === "string") {
        if (err.message === "{}") {
          return "Cloud connection failure: The database authentication server is currently unreachable. Please make sure you are online and that the database is active.";
        }
        return err.message;
      }
      try {
        return JSON.stringify(err.message);
      } catch {
        // Fallback
      }
    }

    if (err.error_description && typeof err.error_description === "string") {
      return err.error_description;
    }

    if (err.error && typeof err.error === "string") {
      return err.error;
    }

    // Try standard toString
    if (err.toString && typeof err.toString === "function") {
      const str = err.toString();
      if (str && str !== "[object Object]") {
        return str;
      }
    }

    // Try stringifying the object
    try {
      const str = JSON.stringify(err);
      if (str && str !== "{}") {
        return str;
      }
    } catch {
      // Fallback
    }

    return "Cloud connection failure: Could not reach the cloud authentication gateway. Please check your credentials or network status.";
  };

  // Handle password recovery email dispatch
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address to receive reset instructions.");
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) throw error;
      setResetSuccess(true);
      setInfoMsg("A security reset link has been dispatched to your email address. Please follow the instructions to reset your passcode.");
    } catch (err: any) {
      console.error("Supabase password reset failed:", err);
      setErrorMsg(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email/password authentication strictly using the configured Supabase instance
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);

    try {
      if (activeTab === "signin") {
        // Attempt primary authentication via Supabase Cloud Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user) {
          const mappedUser: User = {
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Scholar User",
            provider: "email",
            avatarUrl: data.user.user_metadata?.avatar_url
          };
          
          // Sync session data to local database profiles for relational integrity
          try {
            await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: mappedUser.email,
                name: mappedUser.name,
                provider: "email",
                avatarUrl: mappedUser.avatarUrl
              })
            });
          } catch (syncErr) {
            console.warn("Failed to sync Supabase user session to local database:", syncErr);
          }

          localStorage.setItem("apex-research-user", JSON.stringify(mappedUser));
          onSuccess(mappedUser);
          onClose();
          return;
        } else {
          throw new Error("Unable to establish credentials session.");
        }
      } else {
        // Sign Up / Registration
        if (!fullname) {
          throw new Error("Full name is required for registration.");
        }
        
        // Attempt signup via Supabase Cloud Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullname,
            }
          }
        });
        if (error) throw error;

        if (data.user) {
          if (data.session) {
            const mappedUser: User = {
              id: data.user.id,
              email: data.user.email || "",
              name: data.user.user_metadata?.full_name || fullname || data.user.email?.split("@")[0] || "Scholar User",
              provider: "email",
              avatarUrl: data.user.user_metadata?.avatar_url
            };

            // Sync session data to local database profiles for relational integrity
            try {
              await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: mappedUser.email,
                  name: mappedUser.name,
                  provider: "email",
                  avatarUrl: mappedUser.avatarUrl
                })
              });
            } catch (syncErr) {
              console.warn("Failed to sync Supabase sign-up session to local database:", syncErr);
            }

            localStorage.setItem("apex-research-user", JSON.stringify(mappedUser));
            onSuccess(mappedUser);
            onClose();
          } else {
            setActiveTab("signin");
            setInfoMsg("Registration successful! A verification link has been sent to your inbox. Please click the confirmation link in the email to activate your account, and then you can sign in below.");
          }
          return;
        }
      }
    } catch (err: any) {
      console.error("Authentication failed:", err);
      setErrorMsg(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign-up/sign-in OTP verification code submission
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setErrorMsg("Please enter the verification code sent to your email.");
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "signup"
      });
      if (error) throw error;

      if (data.user) {
        const mappedUser: User = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.user_metadata?.full_name || fullname || data.user.email?.split("@")[0] || "Scholar User",
          provider: "email",
          avatarUrl: data.user.user_metadata?.avatar_url
        };
        localStorage.setItem("apex-research-user", JSON.stringify(mappedUser));
        onSuccess(mappedUser);
        onClose();
      } else {
        setErrorMsg("Verification was not completed. Please double-check the code.");
      }
    } catch (err: any) {
      console.error("Verification failed:", err);
      setErrorMsg(err.message || "Incorrect verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070913]/92 backdrop-blur-lg flex justify-center items-center p-4" id="auth-modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 24, stiffness: 180 }}
        className="relative w-full max-w-[430px] vibrant-glass rounded-[28px] p-6 md:p-8 shadow-2xl text-stone-200 overflow-hidden border border-white/5"
        id="auth-modal-card"
      >
        {/* Glow ambient lights matching the APEX palette */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 text-stone-400 hover:text-stone-100 rounded-full border border-white/5 hover:bg-white/5 cursor-pointer transition-colors z-30"
          title="Dismiss portal"
          id="auth-close-btn"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Elegant Header Branding */}
        <div className="text-center mb-6 relative z-10" id="auth-branding">
          <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden relative border border-blue-500/30 mb-3 shadow-lg shadow-indigo-500/10 flex items-center justify-center bg-slate-950 shrink-0">
            <img 
              src="/src/assets/images/apex_logo_4k_bright_1783107552408.jpg" 
              alt="APEX Logo" 
              className="w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="font-display font-black text-xl text-white tracking-tight uppercase">
            APEX CONSORTIUM
          </h3>
          <p className="text-[9px] text-indigo-400 font-mono tracking-widest uppercase mt-1">
            Global Peer Review Platform
          </p>
          
          {/* Beautiful Handwriting Slogan Accent */}
          <p className="font-cursive text-xl text-amber-300/90 mt-2 tracking-wide">
            the pinnacle of elite scholarship
          </p>

          {message && !verificationPending && (
            <div className="mt-4 px-3 py-2 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center gap-2 text-left leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[10.5px] font-medium">{message}</span>
            </div>
          )}
        </div>

        {/* Tab Switcher - Strictly Sign In & Create Account */}
        {!verificationPending && !isForgotPasswordMode && (
          <div className="flex border-b border-white/5 mb-6 relative z-10" id="auth-tab-bar">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center transition-all cursor-pointer border-b-2 ${
                activeTab === "signin"
                  ? "border-blue-500 text-white font-black"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center transition-all cursor-pointer border-b-2 ${
                activeTab === "signup"
                  ? "border-blue-500 text-white font-black"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Main Authentication Core */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {verificationPending ? (
              /* Verification pending input view */
              <motion.form
                key="verification"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleVerificationSubmit}
                className="space-y-4"
              >
                <div className="text-center space-y-1.5 pb-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Verify Email</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    We sent a security passkey code to <b className="text-stone-200">{email}</b>. Enter it below to unlock access.
                  </p>
                </div>

                {infoMsg && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[10.5px] text-indigo-200 leading-relaxed text-center font-medium">
                    ✨ {infoMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-amber-300 font-cursive block">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full bg-black/30 hover:bg-black/50 focus:bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-stone-200 text-center font-mono tracking-widest placeholder-stone-700 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl text-[10.5px] text-rose-300 leading-relaxed font-medium">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs rounded-xl py-3 cursor-pointer shadow-lg active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationPending(false)}
                  className="w-full text-center text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
                >
                  Back to Registration
                </button>
              </motion.form>
            ) : isForgotPasswordMode ? (
              /* Forgot password mode view */
              <motion.form
                key="forgotpassword"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleResetPasswordSubmit}
                className="space-y-4"
              >
                <div className="text-center space-y-1.5 pb-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Reset Security Keycode</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Enter your academic email address below to receive secure passcode reset instructions.
                  </p>
                </div>

                {infoMsg && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[10.5px] text-indigo-200 leading-relaxed text-center font-medium">
                    ✨ {infoMsg}
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl text-[10.5px] text-rose-300 leading-relaxed font-medium">
                    {errorMsg}
                  </div>
                )}

                {!resetSuccess && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-amber-300 font-cursive block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-600" />
                      <input
                        type="email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="scholar@apex-consortium.org"
                        className="w-full bg-black/20 hover:bg-black/40 focus:bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || resetSuccess}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs rounded-xl py-3 cursor-pointer shadow-lg active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  {isLoading ? "Dispatching..." : "Send Reset Passcode"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setErrorMsg(null);
                    setInfoMsg(null);
                    setResetSuccess(false);
                  }}
                  className="w-full text-center text-[10.5px] text-stone-500 hover:text-stone-300 transition-colors flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Login Portal</span>
                </button>
              </motion.form>
            ) : (
              /* Custom Sign-in/Sign-up credential form */
              <motion.div
                key="credentials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {activeTab === "signup" && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-amber-300 font-cursive block">Full Name</label>
                      <input
                        type="text"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        placeholder="Dr. Alexis Vance"
                        className="w-full bg-black/20 hover:bg-black/40 focus:bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-stone-200 placeholder-stone-700 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] text-amber-300 font-cursive block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-600" />
                      <input
                        type="email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="scholar@apex-consortium.org"
                        className="w-full bg-black/20 hover:bg-black/40 focus:bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-amber-300 font-cursive block">Security Keycode</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-600" />
                      <input
                        type="password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-black/20 hover:bg-black/40 focus:bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {activeTab === "signin" && (
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordMode(true);
                          setErrorMsg(null);
                          setInfoMsg(null);
                          setResetSuccess(false);
                        }}
                        className="text-[10.5px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {infoMsg && (
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[10.5px] text-indigo-200 leading-relaxed text-center font-medium">
                      ✨ {infoMsg}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl">
                      <p className="text-[10.5px] text-rose-300 leading-relaxed font-medium">
                        {errorMsg}
                      </p>
                    </div>
                  )}

                  {/* High-visibility Gorgeous Custom CSS Login / Create Account Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-black text-xs rounded-xl py-3 cursor-pointer shadow-lg active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                    id="primary-auth-submit"
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:animate-[shine_1s_ease-in-out]" />
                    <span>
                      {isLoading
                        ? "Authenticating..."
                        : activeTab === "signin"
                        ? "Authorize Sign In"
                        : "Register Credentials"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {/* Secondary Guest / Return to Homepage Option */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 text-stone-400 hover:text-stone-200 font-bold text-xs rounded-xl py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    id="auth-guest-close-btn"
                  >
                    <span>Browse Main Page as Guest</span>
                  </button>
                </form>

                {/* Custom Supabase Settings collapsible panel */}
                <div className="mt-4 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCustomSettingsOpen(!isCustomSettingsOpen)}
                    className="w-full text-[11px] text-stone-500 hover:text-stone-300 flex items-center justify-between transition-colors font-mono py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-stone-500" />
                      {hasCustomSupabase ? "⚙️ USING CUSTOM SUPABASE PROJECT" : "🔗 CONNECT YOUR OWN SUPABASE DATABASE"}
                    </span>
                    <span className="text-[9px]">{isCustomSettingsOpen ? "[ HIDE ]" : "[ SHOW ]"}</span>
                  </button>

                  {isCustomSettingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2.5 p-3.5 bg-black/40 border border-white/5 rounded-xl space-y-3"
                    >
                      <p className="text-[10px] text-stone-400 leading-relaxed">
                        To bypass shared SMTP rate limits and keep your data private, enter your own Supabase project credentials. They will be saved securely in your browser storage.
                      </p>
                      
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-mono text-stone-500 block">Supabase Project URL</span>
                          <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="https://your-project.supabase.co"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10.5px] text-stone-200 placeholder-stone-700 font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9.5px] font-mono text-stone-500 block">Supabase Anon Key</span>
                          <input
                            type="password"
                            value={customKey}
                            onChange={(e) => setCustomKey(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1Ni..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10.5px] text-stone-200 placeholder-stone-700 font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (customUrl && customKey) {
                                localStorage.setItem("custom-supabase-url", customUrl.trim());
                                localStorage.setItem("custom-supabase-key", customKey.trim());
                                window.location.reload();
                              } else {
                                alert("Please enter both the Supabase URL and Anon Key.");
                              }
                            }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg py-1.5 uppercase tracking-wider transition-colors cursor-pointer text-center"
                          >
                            Apply & Reconnect
                          </button>
                          
                          {hasCustomSupabase && (
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.removeItem("custom-supabase-url");
                                localStorage.removeItem("custom-supabase-key");
                                window.location.reload();
                              }}
                              className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[10px] rounded-lg px-3 py-1.5 uppercase tracking-wider transition-colors cursor-pointer text-center"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Secure Active Handshake indicator */}
                <div className="pt-2 text-center">
                  <span className="text-[9.5px] font-mono tracking-wider text-cyan-500/80 uppercase">
                    🔒 encrypted military-grade session gateway
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
