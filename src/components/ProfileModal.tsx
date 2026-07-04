import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import { X, Camera, Upload, Link, Check, Loader2, Sparkles, RefreshCw, Palette, Shuffle, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProfileModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateProfile: (updatedUser: User) => Promise<void>;
}

// Preset scientific seed tags for fun avatars
const SCHOLAR_PRESETS = [
  { name: "Marie Curie", seed: "Curie", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Curie" },
  { name: "Albert Einstein", seed: "Einstein", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Einstein" },
  { name: "Ada Lovelace", seed: "Ada", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Ada" },
  { name: "Alan Turing", seed: "Turing", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Turing" },
  { name: "Nikola Tesla", seed: "Tesla", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Tesla" },
  { name: "Rosalind Franklin", seed: "Franklin", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Franklin" },
  { name: "Isaac Newton", seed: "Newton", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Newton" },
  { name: "Charles Darwin", seed: "Darwin", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Darwin" },
];

const PRESET_GRADIENTS = [
  { name: "Royal Blue", color: "#3b82f6" },
  { name: "Emerald Mint", color: "#10b981" },
  { name: "Sunset Crimson", color: "#ef4444" },
  { name: "Golden Aura", color: "#f59e0b" },
  { name: "Deep Violet", color: "#8b5cf6" },
  { name: "Cosmic Rose", color: "#ec4899" },
  { name: "Ocean Teal", color: "#14b8a6" },
  { name: "Indigo Nebula", color: "#6366f1" },
  { name: "Cyber Cyan", color: "#06b6d4" },
  { name: "Flame Orange", color: "#f97316" }
];

export function adjustColorBrightness(hex: string, percent: number) {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(((R * (100 + percent)) / 100).toString());
  G = parseInt(((G * (100 + percent)) / 100).toString());
  B = parseInt(((B * (100 + percent)) / 100).toString());

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  R = R > 0 ? R : 0;
  G = G > 0 ? G : 0;
  B = B > 0 ? B : 0;

  const rHex = R.toString(16).padStart(2, "0");
  const gHex = G.toString(16).padStart(2, "0");
  const bHex = B.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

export function getInitialAvatar(name: string, character?: string, customColor?: string) {
  const initial = (character || (name ? name.charAt(0) : "S")).toUpperCase();
  
  // Hash name for consistent color if custom color not supplied
  const colors = PRESET_GRADIENTS.map(g => g.color);
  let color = customColor;
  if (!color) {
    let hash = 0;
    for (let i = 0; i < (name || "S").length; i++) {
      hash = (name || "S").charCodeAt(i) + ((hash << 5) - hash);
    }
    color = colors[Math.abs(hash) % colors.length];
  }

  const gradientEnd = adjustColorBrightness(color, -25);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" />
        <stop offset="100%" stop-color="${gradientEnd}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#avatarGrad)"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${initial}</text>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ProfileModal({ currentUser, onClose, onUpdateProfile }: ProfileModalProps) {
  const [name, setName] = useState(currentUser.name || "");
  const [avatarMode, setAvatarMode] = useState<"initial" | "presets" | "custom_url" | "upload">("initial");
  
  // Custom states
  const [customLetter, setCustomLetter] = useState((currentUser.name ? currentUser.name.charAt(0) : "S").toUpperCase());
  const [selectedColor, setSelectedColor] = useState(PRESET_GRADIENTS[0].color);
  const [customUrl, setCustomUrl] = useState("");
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync custom letter when name changes (if they haven't overridden it manually)
  useEffect(() => {
    if (name.trim()) {
      setCustomLetter(name.trim().charAt(0).toUpperCase());
    }
  }, [name]);

  // Determine active preview URL based on selected mode
  const getPreviewUrl = () => {
    switch (avatarMode) {
      case "initial":
        return getInitialAvatar(name || "S", customLetter, selectedColor);
      case "presets":
        return currentUser.avatarUrl && currentUser.avatarUrl.includes("api.dicebear.com") 
          ? currentUser.avatarUrl 
          : SCHOLAR_PRESETS[0].url;
      case "custom_url":
        return customUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150";
      case "upload":
        return uploadBase64 || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
    }
  };

  // Trigger file input
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Convert uploaded image file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg("Image size should be less than 2 MB.");
        return;
      }
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadBase64(reader.result as string);
        setAvatarMode("upload");
      };
      reader.onerror = () => {
        setErrorMsg("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Choose random letter for initials
  const handleShuffleLetter = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomChar = letters.charAt(Math.floor(Math.random() * letters.length));
    setCustomLetter(randomChar);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    let finalAvatarUrl = currentUser.avatarUrl;
    if (avatarMode === "initial") {
      finalAvatarUrl = getInitialAvatar(name, customLetter, selectedColor);
    } else if (avatarMode === "presets") {
      // Keep existing presets if selected, otherwise set default preset
      if (!currentUser.avatarUrl || !currentUser.avatarUrl.includes("api.dicebear.com")) {
        finalAvatarUrl = SCHOLAR_PRESETS[0].url;
      }
    } else if (avatarMode === "custom_url") {
      if (!customUrl.startsWith("http://") && !customUrl.startsWith("https://") && !customUrl.startsWith("data:")) {
        setErrorMsg("Please enter a valid absolute image web URL.");
        setIsSaving(false);
        return;
      }
      finalAvatarUrl = customUrl;
    } else if (avatarMode === "upload") {
      if (!uploadBase64) {
        setErrorMsg("Please select an image file to upload.");
        setIsSaving(false);
        return;
      }
      finalAvatarUrl = uploadBase64;
    }

    try {
      await onUpdateProfile({
        ...currentUser,
        name: name.trim(),
        avatarUrl: finalAvatarUrl
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update your academic identity.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-[#090e1a]/95 border border-white/10 hover:border-cyan-400/30 rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left z-10"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-150 p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-[10px] font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 px-2.5 py-1 rounded font-semibold tracking-wide uppercase">
            Identity Hub
          </span>
          <h3 className="font-display font-bold text-stone-100 text-lg md:text-xl mt-3">
            Scholarly Profile Settings
          </h3>
          <p className="text-stone-400 text-xs mt-1 font-semibold">
            Manage your global research identity, display signature, and public scholar avatar.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/30 border border-rose-500/30 text-rose-300 rounded-xl p-3.5 text-xs mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          {/* Main User Preview Header */}
          <div className="flex items-center gap-5 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
            <div className="relative group shrink-0">
              <img
                src={getPreviewUrl()}
                alt="Profile Preview"
                className="w-16 h-16 rounded-2xl border-2 border-cyan-400/50 bg-stone-900 object-cover shadow-xl transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-stone-950 p-1 rounded-lg border border-slate-950 shadow-md">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-extrabold">Active Scholar Preview</p>
              <h4 className="text-stone-100 font-display font-bold text-base truncate mt-1">{name || "Anonymous Scholar"}</h4>
              <p className="text-stone-400 text-xs truncate mt-0.5">{currentUser.email}</p>
            </div>
          </div>

          {/* Name Editing */}
          <div>
            <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wide mb-1.5 font-bold">
              Scholar Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marie Curie"
              className="w-full bg-[#03060f]/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-cyan-500/80 transition-all font-sans font-semibold"
            />
          </div>

          {/* Avatar Settings Tab */}
          <div>
            <label className="block text-[10px] font-mono text-stone-400 uppercase tracking-wide mb-3 font-bold">
              Choose Profile Picture Style
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-950/60 p-1.5 border border-slate-900 rounded-xl">
              {[
                { id: "initial", label: "Initials" },
                { id: "presets", label: "Presets" },
                { id: "custom_url", label: "Web Link" },
                { id: "upload", label: "Upload" }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAvatarMode(m.id as any)}
                  className={`py-2 text-center rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                    avatarMode === m.id
                      ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-extrabold shadow-sm"
                      : "text-stone-400 hover:text-stone-250 border border-transparent"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Sub-panels based on active tab */}
            <div className="min-h-[140px] bg-[#03060f]/30 border border-slate-900/60 rounded-2xl p-4">
              
              {/* Option A: Dynamic Initials Avatar */}
              {avatarMode === "initial" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-1/3">
                      <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1">
                        Letter
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          maxLength={2}
                          value={customLetter}
                          onChange={(e) => setCustomLetter(e.target.value.substring(0, 2))}
                          className="w-full text-center bg-slate-950/80 border border-slate-800 rounded-lg py-2 text-xs font-bold text-stone-100 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={handleShuffleLetter}
                          className="p-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-stone-400 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Shuffle Fallback Letter"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="w-2/3">
                      <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1">
                        Select Aesthetic Theme
                      </label>
                      <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-2">
                        <Palette className="w-3.5 h-3.5 text-stone-500 mr-1" />
                        <span className="text-[10px] text-stone-300 font-semibold truncate font-mono">
                          {PRESET_GRADIENTS.find(g => g.color === selectedColor)?.name || "Custom Slate"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">
                      Background Palette
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_GRADIENTS.map((g) => (
                        <button
                          key={g.color}
                          type="button"
                          onClick={() => setSelectedColor(g.color)}
                          className={`w-6 h-6 rounded-full transition-all cursor-pointer transform hover:scale-110 flex items-center justify-center border ${
                            selectedColor === g.color 
                              ? "border-white ring-2 ring-cyan-500/40 scale-105" 
                              : "border-transparent hover:border-white/30"
                          }`}
                          style={{ background: `linear-gradient(135deg, ${g.color}, ${adjustColorBrightness(g.color, -30)})` }}
                          title={g.name}
                        >
                          {selectedColor === g.color && (
                            <Check className="w-3 h-3 text-white stroke-[3px]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Option B: Presets */}
              {avatarMode === "presets" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider font-bold">
                      Pick a Legendary Scholar Avatar Seed
                    </span>
                    <span className="text-[9px] text-cyan-400 font-mono">Robot Avatars</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SCHOLAR_PRESETS.map((item) => (
                      <button
                        key={item.seed}
                        type="button"
                        onClick={() => {
                          currentUser.avatarUrl = item.url;
                          setAvatarMode("presets");
                          // trigger update
                          setName(name);
                        }}
                        className={`p-1 bg-slate-950/60 hover:bg-slate-900 border rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer transform hover:scale-[1.03] ${
                          currentUser.avatarUrl === item.url 
                            ? "border-cyan-500 ring-1 ring-cyan-500/20 bg-slate-900/60" 
                            : "border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="w-10 h-10 rounded-lg bg-[#0c1223] object-cover" 
                        />
                        <span className="text-[8px] text-stone-400 font-semibold text-center truncate w-full max-w-full px-1">
                          {item.seed}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Option C: Custom Web URL */}
              {avatarMode === "custom_url" && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1.5 font-bold">
                      Absolute Image Address URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-100 placeholder-stone-650 focus:outline-none focus:border-cyan-500"
                      />
                      <Link className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-3.5" />
                    </div>
                    <p className="text-[8px] text-stone-500 mt-2 leading-relaxed">
                      Make sure you enter a valid URL pointing directly to an image asset (PNG, JPG, SVG, WebP) with CORS public access.
                    </p>
                  </div>
                </div>
              )}

              {/* Option D: Direct Photo Upload */}
              {avatarMode === "upload" && (
                <div className="space-y-3 animate-fade-in flex flex-col items-center justify-center py-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {uploadBase64 ? (
                    <div className="flex items-center gap-4 w-full bg-slate-950/50 p-3 border border-slate-900 rounded-xl">
                      <img
                        src={uploadBase64}
                        alt="Uploaded"
                        className="w-12 h-12 rounded-xl object-cover border border-cyan-400/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Image Loaded Successfully
                        </p>
                        <p className="text-[8px] text-stone-450 truncate font-mono mt-0.5">Ready to be written to persistent database</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleUploadClick}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-bold text-stone-300 rounded-lg cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={handleUploadClick}
                      className="w-full border-2 border-dashed border-slate-850 hover:border-cyan-500/50 hover:bg-cyan-500/[0.01] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                    >
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-stone-400 group-hover:text-cyan-400 shadow-md">
                        <Upload className="w-4 h-4" />
                      </div>
                      <p className="text-stone-300 text-[10px] font-bold">Upload Scholar Portrait Picture</p>
                      <p className="text-stone-500 text-[8px] font-mono">Accepts JPG, PNG, WebP up to 2 MB</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-900 mt-6">
            <span className="text-[8px] text-stone-500 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Synced to the global scholar registry instantly.
            </span>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-stone-400 hover:text-stone-250 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/20 disabled:opacity-55"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Apply Changes
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
