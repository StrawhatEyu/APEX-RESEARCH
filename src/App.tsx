/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ResearchPaper, User, ResearchNote } from "./types";
import { RESEARCH_CATEGORIES } from "./data";
import SearchHelp from "./components/SearchHelp";
import DocumentViewer from "./components/DocumentViewer";
import SyndicationShowcase from "./components/SyndicationShowcase";
import UploadWizard from "./components/UploadWizard";
import MyLibrary from "./components/MyLibrary";
import CursorTrailCanvas from "./components/CursorTrailCanvas";
import AuthModal from "./components/AuthModal";
import ProfileModal, { getInitialAvatar } from "./components/ProfileModal";
import ResetPasswordModal from "./components/ResetPasswordModal";
import SupabaseDashboardModal from "./components/SupabaseDashboardModal";
import apexLogo from './assets/images/apex_logo_4k_bright_1783107217395.jpg';
import HelpGuideModal from "./components/HelpGuideModal";
import { 
  Search, BookOpen, Upload, Library, Globe, Sparkles, Download, 
  Bookmark, BookmarkCheck, ChevronRight, ChevronLeft, HelpCircle, Loader2, Info, ArrowUpRight,
  ShieldCheck, Users, Activity, FileText, Target, Award, CheckCircle2, Zap, Compass, Check, LogOut, LogIn, X,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  supabase, 
  isSupabaseActive, 
  syncSupabaseProfile, 
  syncSupabaseBookmarks, 
  syncSupabaseNotes, 
  fetchSupabaseLibraryData 
} from "./lib/supabase-service";

export default function App() {
  // User Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authMessage, setAuthMessage] = useState<string>("");
  const [pendingPaper, setPendingPaper] = useState<ResearchPaper | null>(null);

  // Automatic high-fidelity iframe popup OAuth handler and synchronizer
  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    const hasCode = search.includes("code=") || hash.includes("code=");
    const hasToken = hash.includes("access_token=") || search.includes("access_token=");

    if (hasCode || hasToken) {
      const authenticateAndClose = async () => {
        try {
          // 1. Process session in this window (which might be the popup)
          if (search && search.includes("code=")) {
            const match = search.match(/[?&]code=([^&]+)/);
            if (match) {
              const code = match[1];
              await supabase.auth.exchangeCodeForSession(code);
            }
          } else if (hash && hash.includes("access_token=")) {
            const tokenMatch = hash.match(/[#?&]access_token=([^&]+)/);
            const refreshMatch = hash.match(/[#?&]refresh_token=([^&]+)/);
            if (tokenMatch && refreshMatch) {
              await supabase.auth.setSession({
                access_token: tokenMatch[1],
                refresh_token: refreshMatch[1]
              });
            }
          }

          // 2. Notify parent window if we are a popup
          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage(
                {
                  type: "supabase-oauth-callback",
                  search,
                  hash,
                },
                window.location.origin
              );
            } catch (postErr) {
              console.warn("Could not postMessage to opener:", postErr);
            }

            // Render a clean modern success screen in the popup
            const splash = document.createElement("div");
            splash.style.position = "fixed";
            splash.style.inset = "0";
            splash.style.backgroundColor = "#070913";
            splash.style.color = "#ffffff";
            splash.style.display = "flex";
            splash.style.flexDirection = "column";
            splash.style.alignItems = "center";
            splash.style.justifyContent = "center";
            splash.style.fontFamily = "system-ui, -apple-system, sans-serif";
            splash.style.padding = "24px";
            splash.style.textAlign = "center";
            splash.style.zIndex = "999999";
            splash.innerHTML = `
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.025em; color: #ffffff;">AUTHORIZED SECURELY</h1>
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 24px 0; line-height: 1.5; max-width: 320px;">Your research gateway identity has been authorized. Synchronizing workspace sessions...</p>
              <div style="font-size: 11px; font-family: monospace; color: #64748b; background: rgba(255, 255, 255, 0.02); padding: 8px 16px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.05);">CLOSING CONNECTION TAB</div>
            `;
            document.body.appendChild(splash);

            // Safely shut down popup window
            setTimeout(() => {
              window.close();
            }, 1200);
          } else {
            // We are the main window, clean up the URL parameters
            window.history.replaceState(null, "", window.location.pathname);
          }
        } catch (err) {
          console.error("Popup/Redirect session exchange failed:", err);
        }
      };

      authenticateAndClose();
    }

    // 2. PARENT WINDOW LISTENER: Receive credentials and process session login instantly
    const handleOAuthCallbackMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "supabase-oauth-callback") {
        console.log("Parent received Supabase OAuth callback payload:", event.data);
        const { search: pSearch, hash: pHash } = event.data;

        try {
          if (pSearch && pSearch.includes("code=")) {
            const match = pSearch.match(/[?&]code=([^&]+)/);
            if (match) {
              const code = match[1];
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              if (data.user) {
                setShowAuth(false);
              }
            }
          } else if (pHash && pHash.includes("access_token=")) {
            const tokenMatch = pHash.match(/[#?&]access_token=([^&]+)/);
            const refreshMatch = pHash.match(/[#?&]refresh_token=([^&]+)/);
            if (tokenMatch && refreshMatch) {
              const { data, error } = await supabase.auth.setSession({
                access_token: tokenMatch[1],
                refresh_token: refreshMatch[1]
              });
              if (error) throw error;
              if (data.user) {
                setShowAuth(false);
              }
            }
          }
        } catch (err: any) {
          console.error("Failed to set session from incoming popup message:", err);
          setAuthMessage(err.message || "Unable to parse OAuth connection response.");
        }
      }
    };

    // 3. STORAGE & POLLING LISTENERS: Instantly detect session updates from any window/tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("sb-") && e.key.includes("-auth-token")) {
        console.log("Detected auth storage change! Syncing session...");
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setShowAuth(false);
          }
        }).catch(err => {
          console.warn("Supabase session sync failed during storage change event:", err);
        });
      }
    };

    // Robust Polling Fallback: Check for new session every 1.5 seconds
    const pollInterval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setShowAuth(false);
        }
      }).catch(err => {
        // Silently capture fetching errors to avoid polluting the browser console
        console.debug("Silent poll fallback session check failed:", err);
      });
    }, 1500);

    window.addEventListener("message", handleOAuthCallbackMessage);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("message", handleOAuthCallbackMessage);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Sync Supabase authentication state changes and loads active user profile
  useEffect(() => {
    if (isSupabaseActive) {
      const syncUser = async (supabaseUser: any) => {
        if (supabaseUser) {
          const providerConnection = supabaseUser.app_metadata?.provider || "email";
          const localUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || "",
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "Scholar User",
            provider: providerConnection,
            avatarUrl: supabaseUser.user_metadata?.avatar_url || getInitialAvatar(supabaseUser.email || ""),
          };

          if (!currentUser || currentUser.id !== localUser.id) {
            setCurrentUser(localUser);
            localStorage.setItem("apex-research-user", JSON.stringify(localUser));
            setShowAuth(false);
            setAuthMessage("");

            if (pendingPaper) {
              setActivePaper(pendingPaper);
              const filtered = history.filter(id => id !== pendingPaper.id);
              const nextHistory = [pendingPaper.id, ...filtered];
              setHistory(nextHistory);
              localStorage.setItem("apex-research-history", JSON.stringify(nextHistory));
              syncUserLibraryWithBackend(localUser.id, undefined, undefined, nextHistory);
              incrementPaperStat(pendingPaper.id, "read");
              setPendingPaper(null);
            }

            // Sync user details to 'profiles' table if it exists
            await syncSupabaseProfile(localUser);

            // Load saved user library (bookmarks, history, downloads, notes) from Supabase OR Express fallback
            const supabaseData = await fetchSupabaseLibraryData(localUser.id);
            if (supabaseData) {
              if (supabaseData.bookmarks) {
                setBookmarks(supabaseData.bookmarks);
                localStorage.setItem("apex-research-bookmarks", JSON.stringify(supabaseData.bookmarks));
              }
              if (supabaseData.downloads) {
                setDownloads(supabaseData.downloads);
                localStorage.setItem("apex-research-downloads", JSON.stringify(supabaseData.downloads));
              }
              if (supabaseData.history) {
                setHistory(supabaseData.history);
                localStorage.setItem("apex-research-history", JSON.stringify(supabaseData.history));
              }
              if (supabaseData.notes) {
                setNotes(supabaseData.notes);
                localStorage.setItem("apex-research-notes", JSON.stringify(supabaseData.notes));
              }
            } else {
              // Full-stack local Express fallback
              fetch(`/api/users/${localUser.id}/data`)
                .then(async res => {
                  if (res.ok) return res.json();
                  if (res.status === 404) {
                    const loginRes = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: localUser.email,
                        name: localUser.name,
                        provider: localUser.provider,
                        avatarUrl: localUser.avatarUrl
                      })
                    });
                    if (loginRes.ok) return loginRes.json();
                  }
                  throw new Error("Backend sync issue");
                })
                .then(data => {
                  if (data) {
                    if (data.bookmarks) setBookmarks(data.bookmarks);
                    if (data.downloads) setDownloads(data.downloads);
                    if (data.history) setHistory(data.history);
                    if (data.notes) setNotes(data.notes);
                  }
                })
                .catch(err => {
                  console.warn("Express backend fallback fetch completed:", err);
                });
            }
          }
        } else {
          // Explicit Sign Out/Clear state - Only clear if not a persistent sandbox user
          const savedUserStr = localStorage.getItem("apex-research-user");
          const parsedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          const isLocalSandboxUser = parsedUser?.id?.startsWith("usr-") || parsedUser?.provider === "email-sandbox";
          
          if (currentUser && !isLocalSandboxUser) {
            setCurrentUser(null);
            localStorage.removeItem("apex-research-user");
            setBookmarks([]);
            setDownloads([]);
            setHistory([]);
            setNotes([]);
          }
        }
      };

      // Query session on initial start
      supabase.auth.getSession().then(({ data: { session } }) => {
        syncUser(session?.user || null);
      }).catch(err => {
        console.warn("Failed to retrieve initial Supabase session, continuing with local Express fallback:", err);
        syncUser(null);
      });

      // Subscribe to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setShowResetPasswordModal(true);
        }
        syncUser(session?.user || null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [pendingPaper, isSupabaseActive]);

  // Supabase Sync Dashboard state
  const [showSupabaseDashboard, setShowSupabaseDashboard] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Secret shortcut (Ctrl+Shift+D) to open Supabase configuration if needed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowSupabaseDashboard(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Contact Us message states
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState<string | null>(null);

  // Navigation tabs: explore, library, upload, syndication
  const [activeTab, setActiveTab] = useState<"explore" | "library" | "upload" | "syndication">("explore");
  const [blueprintTab, setBlueprintTab] = useState<"graphical" | "tabular">("graphical");
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [includeArxiv, setIncludeArxiv] = useState(true);
  const [apiSource, setApiSource] = useState<"all" | "arxiv" | "openalex" | "crossref" | "semanticscholar" | "europepmc" | "plos">("all");

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mouse trail tracker coordinates
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });

  // Suggestion dictionary pool
  const SUGGESTION_POOL = [
    "Artificial Intelligence in Healthcare",
    "Astrophysics & Dark Matter Preprints",
    "Biomaterials and Tissue Scaffolds",
    "Carbon Nanotubes and Conductors",
    "Climate Change Mitigation Models",
    "Desalination & Solar Water Purification",
    "DNA Sequencing & Crispr CAS-9",
    "Machine Learning and Neural Networks",
    "Quantum Computing Superposition Tests",
    "Superconductors & Zero Resistance",
    "Thermodynamics of Green Energy Systems",
    "Renewable Energy & Photovoltaic Solar Cells",
    "Robotics and Autonomous Navigation",
    "Nanoparticles for Targeted Drug Delivery",
    "Biodegradable Plastics from Agricultural Waste",
    "Graphene Membranes for Heavy Metal Filtration",
    "Microplastic Contamination in Soil Ecosystems",
    "Algae Biomass for Jet Fuel Synthesis"
  ];

  // Info Modals / Panels
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);

  // Papers and fetch states
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activePaper, setActivePaper] = useState<ResearchPaper | null>(null);

  // Bookmarks and Downloads local persistence
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);

  // Synchronize local states with persistent database on backend
  const syncUserLibraryWithBackend = async (
    userId: string, 
    updatedBookmarks?: string[], 
    updatedDownloads?: string[], 
    updatedHistory?: string[],
    updatedNotes?: ResearchNote[]
  ) => {
    try {
      const b = updatedBookmarks !== undefined ? updatedBookmarks : bookmarks;
      const d = updatedDownloads !== undefined ? updatedDownloads : downloads;
      const h = updatedHistory !== undefined ? updatedHistory : history;
      const n = updatedNotes !== undefined ? updatedNotes : notes;

      // Direct Supabase database synchronizations
      if (isSupabaseActive) {
        if (updatedBookmarks !== undefined) {
          await syncSupabaseBookmarks(userId, b);
        }
        if (updatedNotes !== undefined) {
          await syncSupabaseNotes(userId, n);
        }
      }

      await fetch(`/api/users/${userId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookmarks: b,
          downloads: d,
          history: h,
          notes: n
        })
      });
      console.log("Synchronized user states to database stores");
    } catch (e) {
      console.error("Failed to sync library data:", e);
    }
  };

  // Helper to increment stats in the database dynamically
  const incrementPaperStat = async (paperId: string, type: "bookmark" | "download" | "read") => {
    try {
      await fetch(`/api/papers/${paperId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
    } catch (e) {
      console.error(`Failed to increment paper ${type}:`, e);
    }
  };

  // Track cursor position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Compute suggestions list dynamically
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const poolMatches = SUGGESTION_POOL.filter(item => 
      item.toLowerCase().includes(q)
    );

    const stateMatches: string[] = [];
    papers.forEach(p => {
      if (p.title.toLowerCase().includes(q)) stateMatches.push(p.title);
      p.authors.forEach(auth => {
        if (auth.toLowerCase().includes(q)) stateMatches.push(auth);
      });
      p.schools.forEach(sch => {
        if (sch.toLowerCase().includes(q)) stateMatches.push(sch);
      });
    });

    const combinedUnique = Array.from(new Set([...poolMatches, ...stateMatches]));
    
    // Sort combined matches so that items starting with the prefix appear first!
    const startsWithQ = (str: string) => str.toLowerCase().startsWith(q);
    const sortedCombined = combinedUnique.sort((a, b) => {
      const aStarts = startsWithQ(a);
      const bStarts = startsWithQ(b);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    }).slice(0, 6);

    setSuggestions(sortedCombined);
  }, [searchQuery, papers]);

  // Handle auto-scrolling smoothly to results grid
  const scrollToResults = () => {
    setTimeout(() => {
      const el = document.getElementById("explore-paper-results-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  // Initialize and load bookmarks/downloads/user from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("apex-research-bookmarks");
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
    const savedDownloads = localStorage.getItem("apex-research-downloads");
    if (savedDownloads) {
      setDownloads(JSON.parse(savedDownloads));
    }
    const savedHistory = localStorage.getItem("apex-research-history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    const savedNotes = localStorage.getItem("apex-research-notes");
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
    const savedUser = localStorage.getItem("apex-research-user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);
      
      // Load real persistent database values from Express backend
      fetch(`/api/users/${parsedUser.id}/data`)
        .then(async res => {
          if (res.ok) return res.json();
          if (res.status === 404) {
            // Re-authenticate/re-register with the backend
            const loginRes = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: parsedUser.email,
                name: parsedUser.name,
                provider: parsedUser.provider,
                avatarUrl: parsedUser.avatarUrl
              })
            });
            if (loginRes.ok) {
              const freshUser = await loginRes.json();
              setCurrentUser(freshUser);
              localStorage.setItem("apex-research-user", JSON.stringify(freshUser));
              return {
                bookmarks: freshUser.bookmarks || [],
                downloads: freshUser.downloads || [],
                history: freshUser.history || [],
                notes: freshUser.notes || []
              };
            }
          }
          throw new Error("Cloud sync failed");
        })
        .then(data => {
          if (data.bookmarks) {
            setBookmarks(data.bookmarks);
            localStorage.setItem("apex-research-bookmarks", JSON.stringify(data.bookmarks));
          }
          if (data.downloads) {
            setDownloads(data.downloads);
            localStorage.setItem("apex-research-downloads", JSON.stringify(data.downloads));
          }
          if (data.history) {
            setHistory(data.history);
            localStorage.setItem("apex-research-history", JSON.stringify(data.history));
          }
          if (data.notes) {
            setNotes(data.notes);
            localStorage.setItem("apex-research-notes", JSON.stringify(data.notes));
          }
        })
        .catch(err => {
          console.error("Backend cloud fetch on startup failed, continuing with offline cache:", err);
        });
    }
  }, []);

  // Fetch papers from Express full-stack API
  const fetchPapers = async (queryText = searchQuery, cat = selectedCategory, external = includeArxiv, source = apiSource) => {
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const url = `/api/papers?search=${encodeURIComponent(queryText)}&category=${encodeURIComponent(cat)}&external=${external}&apiSource=${source}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not retrieve papers.");
      const data = await response.json();
      setPapers(data);
      // Cache results in local storage for seamless offline access and resilience
      localStorage.setItem("apex-cached-papers", JSON.stringify(data));
    } catch (err) {
      console.warn("Network offline or server transient error. Falling back to offline client cache:", err);
      const offlineCache = localStorage.getItem("apex-cached-papers");
      if (offlineCache) {
        setPapers(JSON.parse(offlineCache));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch papers whenever category, external, or apiSource changes
  useEffect(() => {
    if (activeTab === "explore") {
      fetchPapers(searchQuery, selectedCategory, includeArxiv, apiSource);
    }
  }, [selectedCategory, includeArxiv, apiSource, activeTab]);

  // Initial fetch
  useEffect(() => {
    fetchPapers("", "", true, "all");
  }, []);

  // Trigger search on form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPapers(searchQuery, selectedCategory, includeArxiv, apiSource);
    scrollToResults();
  };

  // Handle topic selected from SearchHelp taxonomy assistant
  const handleSelectTopic = (topicName: string) => {
    setSearchQuery(topicName);
    fetchPapers(topicName, selectedCategory, includeArxiv, apiSource);
    scrollToResults();
  };

  // Handle Bookmarking
  const handleToggleBookmark = (paperId: string) => {
    let next: string[];
    const isAdding = !bookmarks.includes(paperId);
    if (bookmarks.includes(paperId)) {
      next = bookmarks.filter((id) => id !== paperId);
    } else {
      next = [...bookmarks, paperId];
    }
    setBookmarks(next);
    localStorage.setItem("apex-research-bookmarks", JSON.stringify(next));

    if (currentUser) {
      syncUserLibraryWithBackend(currentUser.id, next, undefined, undefined);
      if (isAdding) {
        incrementPaperStat(paperId, "bookmark");
      }
    }
  };

  // Handle Downloads
  const handleRecordDownload = (paper: ResearchPaper) => {
    if (!downloads.includes(paper.id)) {
      const next = [...downloads, paper.id];
      setDownloads(next);
      localStorage.setItem("apex-research-downloads", JSON.stringify(next));

      if (currentUser) {
        syncUserLibraryWithBackend(currentUser.id, undefined, next, undefined);
        incrementPaperStat(paper.id, "download");
      }
    }
  };

  // Intercept viewing/reading papers to require authentication
  const handleReadPaper = (paper: ResearchPaper) => {
    if (!currentUser) {
      setPendingPaper(paper);
      setAuthMessage("To protect peer integrity and access automatic AI reviews, please sign in or create a free scholar account.");
      setAuthTab("signin");
      setShowAuth(true);
      return;
    }
    setActivePaper(paper);

    // Track in reading history
    const filtered = history.filter(id => id !== paper.id);
    const nextHistory = [paper.id, ...filtered];
    setHistory(nextHistory);
    localStorage.setItem("apex-research-history", JSON.stringify(nextHistory));

    // Sync with persistent backend database
    syncUserLibraryWithBackend(currentUser.id, undefined, undefined, nextHistory);
    incrementPaperStat(paper.id, "read");
  };

  const handleSaveNote = async (paperId: string, paperTitle: string, category: string, noteText: string) => {
    let nextNotes: ResearchNote[] = [];
    const existing = notes.find(n => n.paperId === paperId);
    if (existing) {
      nextNotes = notes.map(n => n.paperId === paperId ? { ...n, noteText, updatedAt: new Date().toLocaleDateString() } : n);
    } else {
      nextNotes = [
        ...notes,
        {
          id: Math.random().toString(),
          paperId,
          paperTitle,
          category,
          noteText,
          updatedAt: new Date().toLocaleDateString()
        }
      ];
    }
    setNotes(nextNotes);
    localStorage.setItem("apex-research-notes", JSON.stringify(nextNotes));
    if (currentUser) {
      syncUserLibraryWithBackend(currentUser.id, undefined, undefined, undefined, nextNotes);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const nextNotes = notes.filter(n => n.id !== noteId);
    setNotes(nextNotes);
    localStorage.setItem("apex-research-notes", JSON.stringify(nextNotes));
    if (currentUser) {
      syncUserLibraryWithBackend(currentUser.id, undefined, undefined, undefined, nextNotes);
    }
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    try {
      if (isSupabaseActive) {
        await syncSupabaseProfile(updatedUser);
      }
      const response = await fetch(`/api/users/${updatedUser.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updatedUser.name,
          avatarUrl: updatedUser.avatarUrl
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem("apex-research-user", JSON.stringify(data.user));
          console.log("Academic identity successfully updated in the core database:", data.user);
        }
      } else {
        throw new Error("Failed to persist updated profile to backend.");
      }
    } catch (e) {
      console.error("Failed to update profile:", e);
      throw e;
    }
  };

  const handleLogout = async () => {
    if (isSupabaseActive) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase auth sign-out failed (network offline/credentials invalid), proceeding locally:", err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem("apex-research-user");
    localStorage.removeItem("apex-research-bookmarks");
    localStorage.removeItem("apex-research-downloads");
    localStorage.removeItem("apex-research-history");
    localStorage.removeItem("apex-research-notes");
    setBookmarks([]);
    setDownloads([]);
    setHistory([]);
    setNotes([]);
    
    // If we are currently on the upload tab, kick us back to explore
    if (activeTab === "upload") {
      setActiveTab("explore");
    }
  };

  const handleUpdatePaper = async (updatedPaper: ResearchPaper) => {
    try {
      const response = await fetch(`/api/papers/${updatedPaper.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedPaper,
          userId: currentUser?.id
        })
      });
      if (response.ok) {
        // Refetch papers to update list state
        fetchPapers(searchQuery, selectedCategory, includeArxiv, apiSource);
      }
    } catch (e) {
      console.error("Failed to update paper:", e);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      const response = await fetch(`/api/papers/${paperId}?userId=${currentUser?.id || ""}`, {
        method: "DELETE"
      });
      if (response.ok) {
        // Refetch papers to update list state
        fetchPapers(searchQuery, selectedCategory, includeArxiv, apiSource);
      }
    } catch (e) {
      console.error("Failed to delete paper:", e);
    }
  };

  const getCountryEmoji = (country: string) => {
    if (country.includes("United States")) return "🇺🇸";
    if (country.includes("Japan")) return "🇯🇵";
    if (country.includes("Nigeria")) return "🇳🇬";
    if (country.includes("France")) return "🇫🇷";
    return "🌐";
  };

  return (
    <div className="min-h-screen bg-transparent text-stone-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Premium Dynamic Interactive Mouse Glowing Spotlight Aura */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-60 mix-blend-screen hidden md:block"
        style={{
          background: `radial-gradient(650px at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.03), transparent 80%)`
        }}
      />

      {/* HTML5 Canvas-based Glowing Cursor Particle Trail */}
      <CursorTrailCanvas />

      {/* Top Micro-Bar */}
      <div className="bg-slate-950/40 backdrop-blur-sm border-b border-white/5 text-[11px] text-stone-400 px-6 py-2 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block"></span>
            APEX Global Peer Review Consortium
          </span>
          <span className="hidden md:inline text-stone-600">|</span>
          <span className="hidden md:inline">🌐 Linking 140+ countries</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowAboutUs(true)}
            className="hover:text-blue-400 transition-colors cursor-pointer font-bold"
          >
            About Us
          </button>
          <span className="text-stone-700">•</span>
          <button 
            onClick={() => setShowContactUs(true)}
            className="hover:text-blue-400 transition-colors cursor-pointer font-bold"
          >
            Contact Us
          </button>
          <span className="text-stone-700">•</span>
          <button 
            onClick={() => setShowHelpGuide(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-900/40 hover:border-cyan-400/50 transition-all font-sans font-bold cursor-pointer"
            title="How to search efficiently and discover hidden shortcuts"
          >
            <HelpCircle className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Help Guide</span>
          </button>
          <span className="hidden md:inline text-stone-700">•</span>
          <span className="hidden md:inline text-blue-400 font-mono font-medium">📚 Indexing: arXiv & OpenAlex Academic</span>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="border-b border-white/10 bg-slate-950/45 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => setActiveTab("explore")}>
          <div className="w-12 h-12 rounded-xl border border-blue-500/30 overflow-hidden relative shadow-[0_0_15px_rgba(59,130,246,0.2)] flex items-center justify-center bg-slate-950 shrink-0">
            <img 
              src={apexLogo} 
              alt="APEX Mountain Logo" 
              className="absolute inset-0 w-full h-full object-cover object-top scale-100 group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            {/* Ambient vignette glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none" />
          </div>
          <div>
            <h1 className="font-display font-bold text-stone-100 tracking-tight text-sm md:text-base leading-none flex items-center gap-1.5">
              APEX RESEARCH
              <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-800/50 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-extrabold">PREMIUM</span>
            </h1>
            <span className="text-[10px] text-stone-400 font-mono tracking-wider block mt-1 group-hover:text-blue-400 transition-colors">HIGH SCHOOL JOURNAL NETWORK</span>
          </div>
        </div>

        {/* Navigation and User Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
          <nav className="flex gap-1.5 bg-slate-950/80 p-1.5 rounded-full border border-slate-900 shadow-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveTab("explore")}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === "explore" 
                  ? "animated-gradient-btn text-white font-extrabold shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.05]" 
                  : "text-stone-300 hover:text-cyan-400 hover:bg-slate-900/50 border border-transparent hover:border-slate-800/80 scale-[0.98] hover:scale-[1.01]"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Discover</span>
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === "library" 
                  ? "animated-gradient-btn text-white font-extrabold shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.05]" 
                  : "text-stone-300 hover:text-cyan-400 hover:bg-slate-900/50 border border-transparent hover:border-slate-800/80 scale-[0.98] hover:scale-[1.01]"
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>My Library</span>
              {(bookmarks.length > 0 || downloads.length > 0) && (
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span>
              )}
            </button>
            <button
              onClick={() => {
                if (!currentUser) {
                  setAuthMessage("An academic account is required to publish or upload research papers.");
                  setAuthTab("signup");
                  setShowAuth(true);
                  return;
                }
                setActiveTab("upload");
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === "upload" 
                  ? "animated-gradient-btn text-white font-extrabold shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.05]" 
                  : "text-stone-300 hover:text-cyan-400 hover:bg-slate-900/50 border border-transparent hover:border-slate-800/80 scale-[0.98] hover:scale-[1.01]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
            <button
              onClick={() => setActiveTab("syndication")}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                activeTab === "syndication" 
                  ? "animated-gradient-btn text-white font-extrabold shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.05]" 
                  : "text-stone-300 hover:text-cyan-400 hover:bg-slate-900/50 border border-transparent hover:border-slate-800/80 scale-[0.98] hover:scale-[1.01]"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Syndication</span>
            </button>
          </nav>

          {/* Premium User Authentication Status Module */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-900 hover:border-cyan-500/40 transition-all duration-300 px-3 py-1.5 rounded-full shadow-xl cursor-pointer group"
                title="Manage Academic Profile"
              >
                <img 
                  src={currentUser.avatarUrl || getInitialAvatar(currentUser.name)} 
                  alt="User Avatar" 
                  className="w-7 h-7 rounded-full border border-cyan-500/40 bg-stone-900 object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden lg:block text-left mr-1">
                  <p className="text-[10px] font-black text-stone-100 max-w-[110px] truncate leading-tight group-hover:text-cyan-400 transition-colors">{currentUser.name}</p>
                  <p className="text-[8px] font-mono text-cyan-400 uppercase leading-none mt-0.5">Edit Profile</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out of Academic Repository"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMessage("Welcome back! Enter your academic credentials to proceed.");
                    setAuthTab("signin");
                    setShowAuth(true);
                  }}
                  className="px-4 py-2 bg-slate-900/80 hover:bg-slate-850 text-stone-200 border border-slate-800/80 hover:border-slate-700/80 font-bold text-xs rounded-full flex items-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMessage("Create your global scholar identity to access automated AI peer reviews.");
                    setAuthTab("signup");
                    setShowAuth(true);
                  }}
                  className="px-4.5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-black text-xs rounded-full flex items-center gap-1.5 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_22px_rgba(59,130,246,0.45)] cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Stage */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto relative z-10" id="application-main-stage">
        
        {/* ACTIVE TAB: EXPLORE / SEARCH DASHBOARD */}
        {activeTab === "explore" && (
          <div className="space-y-8" id="explore-view">
            {/* Hero Header with a beautiful translucent glassmorphic dark theme */}
            <div className="bg-gradient-to-tr from-[#020617]/35 via-[#0f172a]/30 to-[#1e1b4b]/25 border border-blue-500/20 backdrop-blur-xl rounded-2xl py-5 md:py-6 px-5 md:px-7 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <div className="max-w-xl md:max-w-2xl lg:max-w-3xl md:pr-72 lg:pr-80 relative z-10">
                <span className="text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2.5 py-1 rounded-full font-bold tracking-wide flex items-center gap-1.5 w-max shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                  Global Peer-Reviewed Academic Repository
                </span>
                <h1 className="font-display font-black text-2xl md:text-3xl mt-4 tracking-tight leading-tight flex flex-col xl:flex-row xl:items-center gap-x-3.5 gap-y-2">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-7 h-7 md:w-9 md:h-9 text-cyan-400 shrink-0 animate-pulse" id="main-header-book-icon" />
                    <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Empowering the Next Generation</span>
                  </div>
                  <span className="text-indigo-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">of Global Innovators</span>
                </h1>
                <p className="text-stone-200 font-medium text-xs md:text-sm mt-3 leading-relaxed tracking-normal">
                  A peer-reviewed research repository authored by high school students internationally. Read full papers, download PDFs seamlessly, and query our embedded AI Assistant to simplify theories and draft summaries.
                </p>
              </div>
              
              {/* High-visibility beautiful floating 3D open book with white paper pages and cursive quote */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-52 md:w-68 h-36 md:h-44 pointer-events-none hidden sm:flex items-center justify-center animate-bounce" style={{ animationDuration: '6s' }}>
                <div className="relative w-full h-full bg-[#1c1822] rounded-2xl p-1 shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/10 flex">
                  {/* Leather/Cover backing offset */}
                  <div className="absolute inset-0.5 bg-stone-900 rounded-[14px] shadow-inner" />
                  
                  {/* Left Page (White Paper) */}
                  <div className="w-1/2 bg-[#fafaf9] rounded-l-[10px] m-0.5 p-3 flex flex-col justify-center items-center relative overflow-hidden shadow-[inset_-12px_0_18px_rgba(0,0,0,0.08)] border-r border-stone-200">
                    {/* Subtle notebook lines */}
                    <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[size:100%_12px]" />
                    {/* The Quote */}
                    <p className="font-cursive text-stone-900 text-[10px] md:text-[13px] leading-relaxed text-center font-bold px-1 select-none relative z-10 tracking-wide drop-shadow-[0.5px_0.5px_0px_rgba(255,255,255,0.8)]">
                      "If we knew what we were doing, it wouldn't be called research, would it?"
                    </p>
                  </div>

                  {/* Spine Crease / Center Binder Shadow */}
                  <div className="absolute left-1/2 top-1 bottom-1 w-[5px] -translate-x-1/2 bg-gradient-to-r from-stone-300 via-stone-400 to-stone-300 z-20 shadow-[0_0_8px_rgba(0,0,0,0.25)]" />

                  {/* Right Page (White Paper) */}
                  <div className="w-1/2 bg-[#fafaf9] rounded-r-[10px] m-0.5 p-3 flex flex-col justify-center items-center relative overflow-hidden shadow-[inset_12px_0_18px_rgba(0,0,0,0.08)]">
                    {/* Subtle notebook lines */}
                    <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[size:100%_12px]" />
                    {/* Author & Year */}
                    <div className="text-center select-none relative z-10 flex flex-col items-center">
                      <p className="font-cursive text-stone-900 text-[11px] md:text-[14px] leading-relaxed font-bold tracking-wide drop-shadow-[0.5px_0.5px_0px_rgba(255,255,255,0.8)]">
                        — Albert Einstein
                      </p>
                      <div className="w-8 h-[1px] bg-stone-300 my-2" />
                      <div className="text-[7px] md:text-[8px] font-mono uppercase tracking-widest text-stone-500 font-bold bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                        1952 Core
                      </div>
                    </div>
                  </div>
                  
                  {/* Soft colorful background glow reflecting the image gradient */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-pink-500/30 to-cyan-500/40 rounded-2xl blur-[25px] pointer-events-none opacity-90 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Premium Interactive Search Bar and Filters */}
            <div className="space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex gap-3 relative z-20 items-center">
                <div className="relative flex-1 search-glow-wrapper">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-stone-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search by keywords, author names, high schools, or subjects..."
                    className="w-full bg-slate-950/40 border-none rounded-full pl-11 pr-4 py-2.5 text-sm focus:outline-none text-stone-100 placeholder-stone-500 shadow-inner font-sans transition-all duration-300"
                  />
                  
                  {/* Autocomplete Suggestions dropdown overlay */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-900"
                      >
                        <div className="p-3 text-[10px] font-mono uppercase text-slate-500 bg-slate-950/90 flex items-center justify-between">
                          <span>💡 Autocomplete Suggestions</span>
                          <span className="text-[9px] text-blue-400">Click to auto-complete</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {suggestions.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onMouseDown={() => {
                                setSearchQuery(sug);
                                setShowSuggestions(false);
                                fetchPapers(sug, selectedCategory, includeArxiv, apiSource);
                                scrollToResults();
                              }}
                              className="w-full text-left px-4 py-3.5 text-xs text-stone-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors flex items-center gap-2 border-b border-stone-900 last:border-none font-medium cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{sug}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  type="submit"
                  className="px-6 py-4 animated-gradient-btn text-white font-extrabold rounded-full text-xs shadow-[0_0_15px_rgba(59,130,246,0.15)] cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-white shrink-0" />
                  Query Engine
                </button>
              </form>

              {/* Sub-Filters: Topic Assist, Category Toggles, and API Selection */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-tr from-[#020617]/95 via-[#0f172a]/95 to-[#1e1b4b]/90 border border-blue-500/20 backdrop-blur-xl p-4 rounded-2xl shadow-xl">
                
                {/* Category filters */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-white font-extrabold text-[11px] font-mono mr-1 uppercase">Disciplines:</span>
                  <button
                    onClick={() => { setSelectedCategory(""); scrollToResults(); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all duration-300 ${
                      selectedCategory === "" 
                        ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-extrabold shadow-md scale-[1.02]" 
                        : "bg-slate-900/50 hover:bg-slate-900/80 text-stone-200 hover:text-cyan-300 border border-slate-700/40 hover:border-cyan-500/30"
                    }`}
                  >
                    All Areas
                  </button>
                  {RESEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); scrollToResults(); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all duration-300 ${
                        selectedCategory === cat
                          ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-extrabold shadow-md scale-[1.02]"
                          : "bg-slate-900/50 hover:bg-slate-900/80 text-stone-200 hover:text-cyan-300 border border-slate-700/40 hover:border-cyan-500/30"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* API Source Segment Selection */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 border-t xl:border-t-0 border-slate-700/50 pt-4 xl:pt-0">
                  <span className="text-white font-extrabold text-[11px] font-mono uppercase flex items-center gap-1.5 shrink-0">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Live Academic Index:
                  </span>
                  <div className="flex flex-wrap gap-1.5 bg-slate-950/25 backdrop-blur-md p-1.5 rounded-2xl border border-white/5">
                    {[
                      { id: "all", label: "All 6 Live APIs" },
                      { id: "arxiv", label: "arXiv" },
                      { id: "openalex", label: "OpenAlex" },
                      { id: "crossref", label: "Crossref" },
                      { id: "semanticscholar", label: "Semantic Scholar" },
                      { id: "europepmc", label: "Europe PMC" },
                      { id: "plos", label: "PLOS" },
                    ].map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => { setApiSource(source.id as any); scrollToResults(); }}
                        className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold transition-all duration-300 cursor-pointer ${
                          apiSource === source.id
                            ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.25)] scale-[1.02]"
                            : "bg-transparent text-stone-400 hover:bg-slate-900/80 hover:text-cyan-300"
                        }`}
                      >
                        {source.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Trending Topics Section from user image - fully styled to match our dark twilight theme */}
            <div className="bg-gradient-to-tr from-[#020617]/95 via-[#0f172a]/95 to-[#1e1b4b]/90 border border-blue-500/20 backdrop-blur-xl rounded-2xl p-5 md:p-6 space-y-4 shadow-xl" id="trending-topics-section">
              <div className="flex items-center gap-2">
                <div className="w-5 h-[2px] bg-cyan-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Trending Topics
                </span>
              </div>
              <h2 className="font-display font-black text-xl md:text-2xl text-white tracking-tight">
                Explore what's <span className="font-cursive text-cyan-300 italic text-2xl md:text-3xl">hot</span> in research
              </h2>
              <p className="text-stone-300 text-xs md:text-sm font-medium">
                Click any topic to instantly search for the latest papers. Updated from real academic trends.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1.5">
                {[
                  { name: "DNA & Genetics", emoji: "🧬", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Artificial Intelligence", emoji: "🤖", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Climate Change", emoji: "🌍", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Quantum Physics", emoji: "⚛️", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Neuroscience", emoji: "🧠", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Pharmacology", emoji: "💊", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Astrophysics", emoji: "🚀", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Renewable Energy", emoji: "🔋", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Microbiology", emoji: "🦠", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Machine Learning", emoji: "💻", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Chemistry", emoji: "🧪", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Mathematics", emoji: "📐", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Ecology", emoji: "🌱", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Medicine", emoji: "🩺", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Cosmology", emoji: "🔭", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                  { name: "Materials Science", emoji: "🧲", color: "hover:border-cyan-400/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] text-stone-200" },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTopic(item.name)}
                    className={`px-3 py-2.5 bg-slate-900/40 hover:bg-slate-950 border border-white/5 rounded-xl text-[11px] font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer flex items-center gap-2 justify-center text-center shadow-sm ${item.color}`}
                  >
                    <span className="shrink-0">{item.emoji}</span>
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Search taxonomy and curriculum guide */}
            <SearchHelp 
              onSelectTopic={handleSelectTopic} 
              activeSearchQuery={searchQuery} 
            />

            {/* Research Papers Grid Display */}
            <div id="explore-paper-results-section" className="scroll-mt-24">
              {isLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-stone-450 font-mono text-xs">Querying journals & aligning DOIs...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="explore-paper-grid">
                    {papers.slice((currentPage - 1) * 10, currentPage * 10).map((paper) => {
                      const isBookmarked = bookmarks.includes(paper.id);
                      return (
                        <motion.div
                          key={paper.id}
                          layoutId={`explore-${paper.id}`}
                          className="vibrant-glass-bright hover:border-cyan-400/50 rounded-3xl p-5 md:p-6 shadow-xl hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] transition-all duration-300 flex flex-col justify-between border border-white/10"
                        >
                          <div>
                            {/* Card metadata row */}
                            <div className="flex items-center justify-between mb-3.5">
                              <span className="text-[10px] font-mono uppercase bg-slate-950/40 text-stone-200 border border-white/10 px-2.5 py-1 rounded font-bold">
                                {paper.category}
                              </span>
                              
                              {paper.isExternal ? (
                                <span className="text-[9px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded font-mono font-medium">
                                  {paper.externalSource}
                                </span>
                              ) : (
                                <span className="text-[9px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded font-mono font-medium flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-300" /> Peer Reviewed
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 
                              onClick={() => handleReadPaper(paper)}
                              className="font-display font-bold text-stone-100 text-base leading-snug tracking-tight hover:text-blue-400 cursor-pointer line-clamp-2 mb-2.5 transition-colors duration-300"
                            >
                              {paper.title}
                            </h3>

                            {/* Authors & Institutions */}
                            <div className="text-[11px] text-stone-400 font-sans mb-3 font-medium flex items-center gap-1">
                              <span>{getCountryEmoji(paper.countries[0])}</span>
                              <span className="line-clamp-1">By {paper.authors.join(", ")} of {paper.schools[0]}</span>
                            </div>

                            {/* Abstract Snippet */}
                            <p className="text-stone-350 text-xs line-clamp-3 leading-relaxed mb-6">
                              {paper.abstract}
                            </p>
                          </div>

                          {/* CTA Actions */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-850 mt-auto">
                            <div className="flex items-center gap-3 text-[10px] text-stone-500 font-mono">
                              <span className="flex items-center gap-1">
                                <Download className="w-3.5 h-3.5 text-stone-500" /> {paper.downloadCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Bookmark className="w-3.5 h-3.5 text-stone-500" /> {paper.bookmarkCount}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Bookmark Action */}
                              <button
                                onClick={() => handleToggleBookmark(paper.id)}
                                className={`p-2 rounded-xl border transition-all duration-300 cursor-pointer ${
                                  isBookmarked 
                                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                                    : "bg-slate-950 border-slate-800 text-stone-400 hover:text-blue-400 hover:border-blue-500/30"
                                }`}
                                title="Bookmark paper"
                              >
                                {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-blue-400" /> : <Bookmark className="w-4 h-4" />}
                              </button>

                              {/* Read Paper - Launch embedded DocumentViewer and proxy */}
                              <button
                                onClick={() => handleReadPaper(paper)}
                                className="px-4 py-2.5 animated-gradient-btn text-white font-extrabold rounded-full text-xs flex items-center gap-1 shadow-[0_0_12px_rgba(59,130,246,0.15)] cursor-pointer"
                              >
                                Read Paper <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {papers.length === 0 && (
                      <div className="col-span-full text-center py-20 bg-stone-900 border border-stone-800 rounded-3xl">
                        <Info className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                        <p className="text-stone-300 text-sm font-medium">No papers match your search parameters</p>
                        <p className="text-stone-500 text-xs mt-1">Try toggling subjects or changing academic indices filters.</p>
                      </div>
                    )}
                  </div>

                  {/* Elegant Pagination Controls */}
                  {papers.length > 10 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/45 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg mt-8" id="pagination-controls">
                      <div className="text-xs text-stone-400 font-mono">
                        Showing <span className="text-cyan-400 font-extrabold">{Math.min(papers.length, (currentPage - 1) * 10 + 1)}</span> to{" "}
                        <span className="text-cyan-400 font-extrabold">{Math.min(papers.length, currentPage * 10)}</span> of{" "}
                        <span className="text-cyan-400 font-extrabold">{papers.length}</span> research papers
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => {
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1);
                              scrollToResults();
                            }
                          }}
                          disabled={currentPage === 1}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-800 bg-slate-950 text-stone-350 hover:text-white hover:border-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-300 flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4 text-cyan-400" /> Previous
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.ceil(papers.length / 10) }, (_, i) => i + 1).map((page) => {
                            const isNearCurrent = Math.abs(currentPage - page) <= 1;
                            const isEdge = page === 1 || page === Math.ceil(papers.length / 10);
                            
                            if (isNearCurrent || isEdge) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => {
                                    setCurrentPage(page);
                                    scrollToResults();
                                  }}
                                  className={`w-9 h-9 rounded-xl text-xs font-bold font-mono transition-all duration-350 cursor-pointer ${
                                    currentPage === page
                                      ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-extrabold shadow-md scale-[1.05]"
                                      : "bg-slate-900/50 hover:bg-slate-900 text-stone-350 hover:text-cyan-400 border border-slate-850 hover:border-cyan-500/25"
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            } else if (page === 2 || page === Math.ceil(papers.length / 10) - 1) {
                              return (
                                <span key={page} className="text-stone-500 text-xs font-mono px-1">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>

                        {/* Next Button */}
                        <button
                          onClick={() => {
                            const maxPage = Math.ceil(papers.length / 10);
                            if (currentPage < maxPage) {
                              setCurrentPage(currentPage + 1);
                              scrollToResults();
                            }
                          }}
                          disabled={currentPage === Math.ceil(papers.length / 10)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-850 bg-slate-950 text-stone-350 hover:text-white hover:border-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all duration-300 flex items-center gap-1"
                        >
                          Next <ChevronRight className="w-4 h-4 text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Expanded Content: What Our Services Do, Stats, Stating Purposes, and Benefits */}
            <div className="space-y-12 mt-16 relative z-10" id="platform-educational-sections">
              
              {/* Divider with elegant dark text for a crisp clear reading on clean white glass */}
              <div className="text-center bg-gradient-to-br from-[#0b1e3f] via-[#09152b] to-[#043324] border border-emerald-500/30 p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-xl max-w-3xl mx-auto">
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full font-bold tracking-widest inline-block">
                  Platform Blueprint & Impact
                </span>
                <h2 className="font-display font-black text-2xl md:text-3xl mt-4 text-white tracking-tight leading-snug">
                  Unlocking High School Science Globally
                </h2>
                <p className="text-stone-200 font-medium text-xs md:text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
                  Codioful is an open-access peer-reviewed indexing network built specifically to elevate the original research, engineering breakthroughs, and scientific reviews written by young innovators.
                </p>
              </div>

              {/* Dynamic Platform Statistics Grid with high-contrast elegant handwriting and cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { value: "8,400+", label: "Published Papers", desc: "Peer-reviewed preprints & core manuscripts", color: "from-cyan-300 to-emerald-400", icon: FileText },
                  { value: "15,000+", label: "Student Authors", desc: "Active young researchers globally", color: "from-cyan-300 to-emerald-400", icon: Users },
                  { value: "140+", label: "Countries Represented", desc: "An international science community", color: "from-cyan-300 to-emerald-400", icon: Globe },
                  { value: "1.2M+", label: "Annual Paper Reads", desc: "Downloaded and referenced worldwide", color: "from-cyan-300 to-emerald-400", icon: Activity },
                ].map((stat, idx) => {
                  const IconComp = stat.icon;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -5, scale: 1.025 }}
                      className="bg-gradient-to-br from-[#0b1e3f] via-[#09152b] to-[#043324] rounded-2xl p-5 md:p-6 text-center border border-emerald-500/30 relative overflow-hidden group transition-all duration-300 shadow-md backdrop-blur-xl"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-400 opacity-80" />
                      <div className="mx-auto w-10 h-10 rounded-xl bg-blue-950/50 flex items-center justify-center mb-4 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                        <IconComp className="w-5 h-5 text-emerald-300" />
                      </div>
                      <h3 className={`font-display font-extrabold text-2.5xl md:text-3xl bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                        {stat.value}
                      </h3>
                      <p className="text-white font-black text-xs mt-2 uppercase tracking-wide">{stat.label}</p>
                      <p className="text-stone-300 font-medium text-[10.5px] mt-1.5 leading-relaxed">{stat.desc}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Platform Features Section with blue-green gradient backgrounds */}
              <div className="space-y-6 pt-8 bg-transparent border-0 shadow-none p-0" id="platform-features-section">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full font-bold tracking-widest inline-block">
                    Platform Features
                  </span>
                  <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
                    Everything you need to <span className="font-cursive text-emerald-400 italic text-2xl md:text-3xl">research smarter</span>
                  </h2>
                  <p className="text-stone-200 font-medium text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
                    From real-time API search to on-site PDF reading, ScholarHub replaces a dozen fragmented tools with one seamless experience.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      title: "6-Source Unified Search",
                      desc: "Query arXiv, Crossref, DOAJ, Semantic Scholar, PubMed, and OpenAlex simultaneously with a single search box.",
                      icon: Globe,
                      color: "text-emerald-300 border-emerald-500/30",
                    },
                    {
                      title: "On-Site PDF Viewer",
                      desc: "Read papers without leaving the platform. Our embedded viewer supports zoom, scroll, and fullscreen mode.",
                      icon: BookOpen,
                      color: "text-emerald-300 border-emerald-500/30",
                    },
                    {
                      title: "Upload Your Research",
                      desc: "Share your own papers with the community. Upload PDFs and add metadata so others can discover your work.",
                      icon: Upload,
                      color: "text-emerald-300 border-emerald-500/30",
                    },
                    {
                      title: "Personal Library",
                      desc: "Bookmark papers to your private library. Organize, revisit, and export your reading list anytime.",
                      icon: Library,
                      color: "text-emerald-300 border-emerald-500/30",
                    },
                    {
                      title: "Smart Filtering",
                      desc: "Filter by source database, research categories, and index source for highly granular bibliography discovery.",
                      icon: Target,
                      color: "text-emerald-300 border-emerald-500/30",
                    },
                    {
                      title: "Instant Results",
                      desc: "Real-time API calls mean zero waiting times. Query live databases and access preprints in seconds.",
                      icon: Zap,
                      color: "text-emerald-300 border-emerald-500/30",
                    },
                  ].map((feat, fIdx) => {
                    const FeatIcon = feat.icon;
                    return (
                      <motion.div
                        key={fIdx}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="bg-slate-900/60 p-6 rounded-xl border border-white/10 flex flex-col justify-between hover:border-emerald-400/40 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="space-y-4">
                          <div className={`w-11 h-11 rounded-xl bg-blue-950/50 border ${feat.color} flex items-center justify-center`}>
                            <FeatIcon className="w-5 h-5 text-emerald-300" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">{feat.title}</h3>
                            <p className="text-stone-300 font-medium text-xs mt-2 leading-relaxed">{feat.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Research Methodology Roadmap Section - custom requested by the user */}
              <div className="space-y-6 pt-10 bg-transparent border-0 shadow-none p-0" id="student-research-blueprint">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full font-bold tracking-widest inline-block">
                    Methodology Guide
                  </span>
                  <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
                    Student Research Blueprint: <span className="font-cursive text-emerald-400 italic text-2xl md:text-3xl">Idea to Publication</span>
                  </h2>
                  <p className="text-stone-200 font-medium text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
                    A comprehensive guide designed to take pre-college and university students step-by-step from raw curiosity to indexing preprints with persistent DOIs.
                  </p>
                </div>

                {/* Tab toggle buttons for Graphical vs Tabular views */}
                <div className="flex justify-center mb-6">
                  <div className="bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 flex gap-2">
                    <button
                      onClick={() => setBlueprintTab("graphical")}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                        blueprintTab === "graphical"
                          ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-extrabold shadow-md"
                          : "text-stone-300 hover:text-white"
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Graphical Pathway</span>
                    </button>
                    <button
                      onClick={() => setBlueprintTab("tabular")}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                        blueprintTab === "tabular"
                          ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-extrabold shadow-md"
                          : "text-stone-300 hover:text-white"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Tabular Checklist</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {blueprintTab === "graphical" ? (
                    <motion.div
                      key="graphical-view"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative"
                    >
                      {[
                        { step: "01", phase: "Phase 1: Spark", title: "Define Inquiry", text: "Identify a narrow, open scientific question. Formulate a robust testable hypothesis.", icon: Sparkles, tip: "Avoid overly broad topics. Focus on measurable criteria." },
                        { step: "02", phase: "Phase 2: Deep Dive", title: "Literature Review", text: "Read 15+ peer-reviewed preprints and log citations in your library folder.", icon: BookOpen, tip: "Map existing literature to discover unresolved gaps." },
                        { step: "03", phase: "Phase 3: Experiment", title: "Methodology & Data", text: "Draft testing protocols, construct models, compile datasets or code scripts.", icon: Target, tip: "Keep control samples separate to verify scientific validation." },
                        { step: "04", phase: "Phase 4: Synthesis", title: "Draft Manuscript", text: "Structure findings into sections: Abstract, Intro, Methods, Results, Bib.", icon: FileText, tip: "Include clear charts, graphs, and structured data tables." },
                        { step: "05", phase: "Phase 5: Refinement", title: "Blind Peer Review", text: "Submit your manuscript to receive constructive reviews from academic mentors.", icon: Users, tip: "Embrace revisions as steps to strengthen your citations." },
                        { step: "06", phase: "Phase 6: Legacy", title: "DOI & Publish", text: "Register a permanent Digital Object Identifier. Index with repositories.", icon: Award, tip: "Reference your DOI on portfolios and college applications." }
                      ].map((blueprintStep, bpIdx) => {
                        const BpIcon = blueprintStep.icon;
                        return (
                          <div 
                            key={bpIdx}
                            className="bg-slate-900/60 p-6 rounded-xl border border-white/10 flex flex-col justify-between hover:border-emerald-400/40 hover:shadow-lg transition-all duration-300 group"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded border border-emerald-500/30 font-bold">
                                  {blueprintStep.phase}
                                </span>
                                <span className="text-2xl font-mono font-black text-white/10 group-hover:text-emerald-400/20 transition-colors">
                                  {blueprintStep.step}
                                </span>
                              </div>
                              <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                                  <BpIcon className="w-5 h-5" />
                                </div>
                                <h3 className="font-display font-black text-white text-sm tracking-wide uppercase">{blueprintStep.title}</h3>
                              </div>
                              <p className="text-stone-300 font-medium text-xs leading-relaxed">{blueprintStep.text}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 bg-slate-950/40 p-3 rounded-xl">
                              <span className="text-[9px] font-mono text-emerald-300 uppercase font-bold block">Pro Tip:</span>
                              <span className="text-stone-300 font-medium text-[11px] mt-1 leading-relaxed block">{blueprintStep.tip}</span>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tabular-view"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden shadow-md"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-950/60 border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-stone-200">
                              <th className="p-4 pl-6 font-extrabold">Phase</th>
                              <th className="p-4 font-extrabold">Objective</th>
                              <th className="p-4 font-extrabold">Core Actions Required</th>
                              <th className="p-4 font-extrabold">Success Criteria</th>
                              <th className="p-4 pr-6 text-right font-extrabold">Self Check</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-medium">
                            {[
                              { id: "spark", phase: "Phase 1: Spark", obj: "Inquiry Formulation", actions: "Define a highly narrow scientific query; draft a clear testable hypothesis.", success: "Hypothesis is grounded in existing peer preprints and is falsifiable." },
                              { id: "review", phase: "Phase 2: Deep Dive", obj: "Literature Synthesis", actions: "Read 15+ peer-reviewed papers; catalog theoretical discrepancies.", success: "Comprehensive review of background science, saved to Library." },
                              { id: "execute", phase: "Phase 3: Execution", obj: "Methodology & Design", actions: "Create specific scientific methods; compile raw files or code scripts.", success: "Methods can be completely reproduced by an outside research lab." },
                              { id: "write", phase: "Phase 4: Synthesis", obj: "Manuscript Composition", actions: "Compose standard scientific document (Abstract, Intro, Methods, Results, Bib).", success: "Completed PDF paper styled in standard journal layout." },
                              { id: "review-peer", phase: "Phase 5: Refinement", obj: "Double-Blind Review", actions: "Submit draft to platform reviewers; receive anonymous academic annotations.", success: "Approved by 2+ review mentors after resolving draft revisions." },
                              { id: "publish", phase: "Phase 6: Legacy", obj: "DOI & Syndication", actions: "Register permanent DOI; catalog with global databases for citation tracking.", success: "Paper indexed on public Scholarly engines; citable by name and DOI." }
                            ].map((row, rIdx) => (
                              <tr key={row.id} className="hover:bg-slate-950/30 transition-colors">
                                <td className="p-4 pl-6 font-mono font-bold text-emerald-400 text-[11px] whitespace-nowrap">{row.phase}</td>
                                <td className="p-4 font-bold text-white whitespace-nowrap">{row.obj}</td>
                                <td className="p-4 min-w-[280px] leading-relaxed text-stone-200">{row.actions}</td>
                                <td className="p-4 min-w-[250px] leading-relaxed text-stone-400">{row.success}</td>
                                <td className="p-4 pr-6 text-right">
                                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer" 
                                      id={`check-row-${row.id}`} 
                                    />
                                    <div className="w-5 h-5 rounded bg-slate-950 border border-white/20 peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-emerald-500 peer-checked:border-transparent flex items-center justify-center transition-all duration-200">
                                      <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 font-bold" />
                                    </div>
                                  </label>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stating the Purposes & Core Services: What Our Services Do */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-6">
                
                {/* Core Services (Bright Translucent Cards) */}
                <div className="space-y-4">
                  <h3 className="font-display font-black text-lg md:text-xl text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    What Our Services Do
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      {
                        title: "AI-Powered Theory Simplification",
                        desc: "Our embedded Gemini AI Companion allows visitors and mentors to break down multi-page theoretical physics and molecular biology papers into plain-English abstracts and key takeaways in real time.",
                        icon: Sparkles
                      },
                      {
                        title: "Rigorous Double-Blind Peer Review",
                        desc: "Every manuscript submitted goes through a double-blind academic screening managed by qualified educators, undergraduate mentors, and volunteer university researchers to verify scientific method validation.",
                        icon: ShieldCheck
                      },
                      {
                        title: "Seamless Academic Syndication",
                        desc: "We actively mirror papers from major open-access repositories like arXiv, OpenAlex, and Crossref, combining high school works with globally recognized preprints to expand citation coverage.",
                        icon: Globe
                      }
                    ].map((serv, sIdx) => {
                      const SIcon = serv.icon;
                      return (
                        <div key={sIdx} className="bg-gradient-to-br from-[#0b1e3f] via-[#09152b] to-[#043324] p-5 rounded-xl border border-emerald-500/30 flex gap-4 hover:border-emerald-400/40 transition-colors duration-300 shadow-sm backdrop-blur-xl">
                          <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <SIcon className="w-5 h-5 text-emerald-300" />
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">{serv.title}</h4>
                            <p className="text-stone-300 font-medium text-xs mt-1.5 leading-relaxed">{serv.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stating the Benefits of Uploading */}
                <div className="space-y-4">
                  <h3 className="font-display font-black text-lg md:text-xl text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    How Uploading Benefits You
                  </h3>

                  <div className="bg-gradient-to-br from-[#0b1e3f] via-[#09152b] to-[#043324] p-6 md:p-8 rounded-2xl border border-emerald-500/30 h-full flex flex-col justify-between relative overflow-hidden shadow-sm backdrop-blur-xl">
                    <div className="space-y-5 relative z-10">
                      <p className="text-stone-200 font-bold text-xs md:text-sm leading-relaxed">
                        For pre-college student researchers, publishing early isn't just an accolade—it defines your career pipeline. Establishing verified academic authorship unlocks unique collegiate advantages:
                      </p>

                      <div className="space-y-4">
                        {[
                          { title: "Earn Permanent DOIs", text: "Every approved manuscript is assigned a unique Digital Object Identifier (DOI) making it universally citable by researchers, universities, and industry labs." },
                          { title: "Elevate University Applications", text: "Stating a peer-reviewed publication in your Common App or portfolio demonstrates deep specialized inquiry, separating you from standard high school applicants." },
                          { title: "Secure Research Lab Placement", text: "Send cold emails to university professors with a published DOI in hand to secure competitive undergraduate research fellowships and lab assistant roles." }
                        ].map((benefit, bIdx) => (
                          <div key={bIdx} className="flex gap-2.5 items-start">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-xs text-white block">{benefit.title}</span>
                              <span className="text-stone-300 font-medium text-xs leading-relaxed mt-0.5 block">{benefit.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-emerald-400" />
                        <span className="text-[11px] font-mono text-white uppercase tracking-wider font-extrabold">Fully Indexed • Non-Profit</span>
                      </div>
                      <button 
                        onClick={() => setActiveTab("upload")}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-extrabold text-xs rounded-full transition-all duration-300 cursor-pointer shadow-md"
                      >
                        Start Your Manuscript
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer informational banners */}
            <div className="bg-gradient-to-br from-[#0b1e3f] via-[#09152b] to-[#043324] text-white border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 mt-12 shadow-md backdrop-blur-xl">
              <div>
                <h4 className="font-display font-black text-white text-base flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  Become a Peer Reviewer or Publisher
                </h4>
                <p className="text-stone-200 font-medium text-xs mt-1.5 leading-relaxed max-w-2xl">
                  Are you a student researcher, club lead, or high school teacher? Partner with us to integrate your school's research logs, apply for DOIs, and empower student-led science.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("upload")}
                className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white rounded-full text-xs font-bold shrink-0 cursor-pointer shadow-md flex items-center gap-2"
              >
                Submit Manuscript <ArrowUpRight className="w-4 h-4 text-white" />
              </button>
            </div>

          </div>
        )}

        {/* ACTIVE TAB: MY LIBRARY */}
        {activeTab === "library" && (
          <MyLibrary
            papers={papers}
            bookmarks={bookmarks}
            downloads={downloads}
            history={history}
            notes={notes}
            onDeleteNote={handleDeleteNote}
            onSaveNote={handleSaveNote}
            currentUser={currentUser}
            onReadPaper={(paper) => handleReadPaper(paper)}
            onRemoveBookmark={(id) => handleToggleBookmark(id)}
            onDownloadPaper={(paper) => {
              if (!currentUser) {
                setAuthMessage("Please sign in or create an account to download PDFs.");
                setAuthTab("signin");
                setShowAuth(true);
                return;
              }
              handleRecordDownload(paper);
              // Trigger physical PDF download from arXiv proxy
              const link = document.createElement("a");
              link.href = `/api/pdf-proxy?url=${encodeURIComponent(paper.pdfUrl)}`;
              link.download = `${paper.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            onUpdatePaper={handleUpdatePaper}
            onDeletePaper={handleDeletePaper}
          />
        )}

        {/* ACTIVE TAB: PUBLISH RESEARCH */}
        {activeTab === "upload" && (
          currentUser ? (
            <UploadWizard 
              currentUser={currentUser}
              onUploadSuccess={() => {
                // Trigger papers refetch to populate uploaded item
                fetchPapers(searchQuery, selectedCategory, includeArxiv);
                setActiveTab("library");
              }} 
            />
          ) : (
            <div className="py-20 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-blue-950/50 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Upload className="w-8 h-8 text-blue-400 animate-bounce" />
              </div>
              <h3 className="font-display font-black text-xl text-white">Sign In to Publish</h3>
              <p className="text-stone-400 text-xs leading-relaxed">
                Publishing manuscripts, tracking reviewer annotations, and registering permanent digital object identifiers (DOIs) requires a verified academic account.
              </p>
              <button
                onClick={() => {
                  setAuthMessage("An academic account is required to publish or upload research papers.");
                  setAuthTab("signup");
                  setShowAuth(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-full text-xs shadow-lg cursor-pointer transition-all active:scale-[0.98]"
              >
                Sign In or Create Account
              </button>
            </div>
          )
        )}

        {/* ACTIVE TAB: SYNDICATION PORTALS */}
        {activeTab === "syndication" && (
          <SyndicationShowcase 
            papers={papers} 
            onReadPaper={(paper) => handleReadPaper(paper)} 
          />
        )}

      </main>

      {/* Embedded Document Viewer Drawer and PDF Reader overlay */}
      <AnimatePresence>
        {activePaper && (
          <DocumentViewer
            paper={activePaper}
            isBookmarked={bookmarks.includes(activePaper.id)}
            onToggleBookmark={() => handleToggleBookmark(activePaper.id)}
            onClose={() => setActivePaper(null)}
            onRecordDownload={() => handleRecordDownload(activePaper)}
            notes={notes}
            onSaveNote={handleSaveNote}
          />
        )}
      </AnimatePresence>

      {/* User Authentication Modal */}
      <AnimatePresence>
        {showAuth && (
          <AuthModal
            initialTab={authTab}
            message={authMessage}
            onClose={() => {
              setShowAuth(false);
              setPendingPaper(null);
            }}
            onSuccess={(user) => {
              setCurrentUser(user);
              localStorage.setItem("apex-research-user", JSON.stringify(user));

              // Load synced bookmarks, downloads, and history from backend
              fetch(`/api/users/${user.id}/data`)
                .then(async res => {
                  if (res.ok) return res.json();
                  if (res.status === 404) {
                    const loginRes = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: user.email,
                        name: user.name,
                        provider: user.provider,
                        avatarUrl: user.avatarUrl
                      })
                    });
                    if (loginRes.ok) return loginRes.json();
                  }
                  throw new Error("Could not load cloud user data");
                })
                .then(data => {
                  if (data) {
                    if (data.bookmarks) {
                      setBookmarks(data.bookmarks);
                      localStorage.setItem("apex-research-bookmarks", JSON.stringify(data.bookmarks));
                    }
                    if (data.downloads) {
                      setDownloads(data.downloads);
                      localStorage.setItem("apex-research-downloads", JSON.stringify(data.downloads));
                    }
                    if (data.history) {
                      setHistory(data.history);
                      localStorage.setItem("apex-research-history", JSON.stringify(data.history));
                    }
                    if (data.notes) {
                      setNotes(data.notes);
                      localStorage.setItem("apex-research-notes", JSON.stringify(data.notes));
                    }
                  }
                })
                .catch(err => {
                  console.error("Error loading user cloud data on signin:", err);
                });

              // If there was a pending paper, open it!
              if (pendingPaper) {
                setActivePaper(pendingPaper);
                setPendingPaper(null);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* User Profile Settings Modal */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <ProfileModal
            currentUser={currentUser}
            onClose={() => setShowProfileModal(false)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </AnimatePresence>

      {/* Reset Password Recovery Modal */}
      <AnimatePresence>
        {showResetPasswordModal && (
          <ResetPasswordModal
            onClose={() => setShowResetPasswordModal(false)}
            onSuccess={() => setShowResetPasswordModal(false)}
          />
        )}
      </AnimatePresence>

      {/* About Us Modal */}
      <AnimatePresence>
        {showAboutUs && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center items-start md:items-center p-4 md:py-12" id="about-modal-backdrop">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-gradient-to-b from-[#0e162d] via-[#050914] to-[#0d1429] border border-blue-500/20 rounded-3xl p-6 md:p-8 max-w-2xl w-full text-stone-100 shadow-2xl relative my-auto overflow-hidden"
              id="about-modal-card"
            >
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none" />

              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 relative z-10">
                <h3 className="font-display font-black text-xl md:text-2xl text-stone-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden relative border border-blue-500/30 shrink-0">
                    <img 
                      src="/src/assets/images/apex_logo_4k_bright_1783107552408.jpg" 
                      alt="APEX Logo" 
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span>About APEX Journal</span>
                </h3>
                <button
                  onClick={() => setShowAboutUs(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-5 text-xs md:text-sm text-stone-300 leading-relaxed font-sans relative z-10">
                <div>
                  <p className="text-sm md:text-base text-stone-100 font-medium">
                    <strong className="text-blue-400 font-extrabold">Apex Research High School Network</strong> is an internationally peer-reviewed, open-access research repository specifically tailored for pre-collegiate and student scientists.
                  </p>
                  <p className="mt-2 text-stone-400">
                    Founded to democratize academic opportunities, we bridge the gap between enthusiastic student scientists and professional databases, offering double-blind evaluations and automated AI explanations.
                  </p>
                  <div className="mt-4 p-4 bg-blue-950/25 border border-blue-500/20 rounded-2xl relative">
                    <p className="text-xs text-stone-300 font-medium flex items-center gap-1.5">
                      🇪🇹 <strong className="text-cyan-400 font-bold">Our Development Mission & Partnership:</strong>
                    </p>
                    <p className="mt-1 text-stone-400 text-xs leading-relaxed">
                      I am an <strong>Ethiopian web developer</strong> passionate about mentoring and expanding educational technology. This platform was co-developed and is actively maintained in partnership with brilliant <strong>Ethiopian High School web developer students</strong>. Our collective mission is to dismantle barriers to global academic integration, ensuring young researchers from Addis Ababa to Zurich have first-class access to advanced scientific literature, machine learning simplification, and peer-review publication pipelines.
                    </p>
                  </div>
                </div>

                {/* Why Choose Us */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Why Choose APEX Research?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">1</span>
                        <h5 className="font-bold text-stone-200 text-xs">AI-Powered Simplifications</h5>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-normal">
                        Complex academic mathematics, terminologies, and methodologies are automatically broken down into readable explanations by our built-in Copilot.
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">2</span>
                        <h5 className="font-bold text-stone-200 text-xs">Double-Blind Peer Review</h5>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-normal">
                        Every submission is read and graded by verified PhD candidates, university mentors, and active high school educators.
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">3</span>
                        <h5 className="font-bold text-stone-200 text-xs">Verified DOI Generation</h5>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-normal">
                        Generate real, citable DOIs to list on university applications, common app profiles, and academic CVs.
                      </p>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">4</span>
                        <h5 className="font-bold text-stone-200 text-xs">Universal Open-Access</h5>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-normal">
                        Our entire platform is free and offline-capable. No paywalls, no expensive subscriptions, and no gatekeeping.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Why Students Should Upload Their Research on APEX */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <h4 className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    Why Upload Your Research on APEX?
                  </h4>
                  <p className="text-[11px] text-stone-300">
                    For high school and pre-collegiate students, publishing your work early is a game-changer. Here is why you should choose to host and index your manuscripts on our secure network:
                  </p>
                  <div className="space-y-2.5">
                    <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-2xl flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-xs">A Citable Scientific Legacy</h5>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Every manuscript that passes peer evaluation is assigned a persistent, globally verifiable Digital Object Identifier (DOI). This makes your pre-college research permanently indexed, searchable, and citable by academics worldwide.
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-2xl flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-xs">Mentorship & Peer Feedback Loop</h5>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Unlike standard pre-print servers, our submissions go through an intensive double-blind mentoring screen. You receive constructive, professional feedback from university educators to refine your scientific method and writing.
                        </p>
                      </div>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-2xl flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-white text-xs">Dramatically Boost College Admissions</h5>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          An approved article on APEX establishes verified research capability. List your publication link and DOI directly on your Common Application, UC portals, or scholarship dossiers to stand out to admissions offices.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Essential Business Points */}
                <div className="p-4 bg-blue-950/40 border border-blue-900/30 rounded-2xl space-y-2">
                  <h4 className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> CORE OPERATING TENETS
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-stone-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Academic Honesty:</strong> Integrated automatic plagiarism and reference verification.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Mentorship Acceleration:</strong> Connecting high school authors directly with university research labs.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Cross-Platform Syncing:</strong> Dynamic syndication options using arXiv and standard metadata APIs.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-end relative z-10">
                <button 
                  onClick={() => setShowAboutUs(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold cursor-pointer shadow-lg active:scale-[0.98] transition-transform"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Us Modal */}
      <AnimatePresence>
        {showContactUs && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center items-start md:items-center p-4 md:py-12" id="contact-modal-backdrop">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-gradient-to-b from-[#0e162d] via-[#050914] to-[#0d1429] border border-blue-500/20 rounded-3xl p-6 md:p-8 max-w-xl w-full text-stone-100 shadow-2xl relative my-auto overflow-hidden"
              id="contact-modal-card"
            >
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none" />

              <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5 relative z-10">
                <h3 className="font-display font-black text-xl md:text-2xl text-stone-100 flex items-center gap-2.5">
                  <HelpCircle className="text-blue-500 w-6 h-6 animate-pulse" /> 
                  <span>Contact Editorial Desk</span>
                </h3>
                <button
                  onClick={() => {
                    setShowContactUs(false);
                    setContactSuccessMsg(null);
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4 relative z-10">
                <p className="text-xs text-stone-300 leading-relaxed">
                  Have questions about double-blind peer evaluations, indexing error reports, metadata registry, or high school chapter registration? Drop us a ticket directly below.
                </p>
                <div className="p-3.5 bg-blue-950/30 border border-slate-800/80 rounded-2xl text-xs text-stone-300 leading-relaxed">
                  ⚡ <strong>Student Idea Submission & Bug Reporting:</strong> If you are one of our active <strong>Ethiopian High School web developer students</strong>, a school mentor, or an external partner looking to send error reports, code suggestions, or feedback ideas, please send an email directly to our lead developer Eyuel Wondafrash at <strong className="text-cyan-400 font-mono select-all">eyuelwondafrash014@gmail.com</strong> or use the ticket creator below.
                </div>

                {contactSuccessMsg ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center font-extrabold text-xs">✓</span>
                      <span>Ticket Logged Successfully</span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {contactSuccessMsg}
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setContactSuccessMsg(null)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                      >
                        Send another message
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
                        alert("Please fill in your Name, Email, and Message.");
                        return;
                      }
                      setIsSendingContact(true);
                      setTimeout(() => {
                        setIsSendingContact(false);
                        setContactSuccessMsg(`Thank you, ${contactName}! Your ticket (ID: APX-${Math.floor(1000 + Math.random() * 9000)}) has been registered with our support desk. A verified academic supervisor will reach out to you at ${contactEmail} within 12 hours.`);
                        setContactName("");
                        setContactEmail("");
                        setContactSubject("");
                        setContactMessage("");
                      }, 1200);
                    }}
                    className="space-y-3.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Sarah Jenkins"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Academic Email</label>
                        <input
                          type="email"
                          required
                          placeholder="scholar@stanford.edu"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Subject Topic</label>
                      <input
                        type="text"
                        placeholder="e.g. Manuscript DOI Inquiry"
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">Your Message</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Type your ideas, questions, or peer feedback requests..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-blue-500/50 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingContact}
                      className="w-full py-2.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                    >
                      {isSendingContact ? (
                        <>
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                          <span>Routing ticket to support nodes...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Support Ticket</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Direct office email links */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-900 space-y-2 font-mono text-[10px]">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-stone-500">Lead Ethiopian Developer Email:</span>
                    <span className="text-cyan-400 select-all font-semibold font-mono">eyuelwondafrash014@gmail.com</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-stone-500">Global Desk Email:</span>
                    <span className="text-blue-400 select-all font-semibold font-mono">support@apex-research.org</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-stone-500">Switzerland Headquarters:</span>
                    <span className="text-stone-300">Geneva, CH (Global Consortium Lead)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-end relative z-10">
                <button 
                  onClick={() => {
                    setShowContactUs(false);
                    setContactSuccessMsg(null);
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-stone-400 hover:text-stone-200 border border-slate-800 hover:border-slate-700 rounded-full text-xs font-bold cursor-pointer transition-colors active:scale-[0.98]"
                >
                  Close Support Portal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supabase Sync Dashboard Modal */}
      <SupabaseDashboardModal
        isOpen={showSupabaseDashboard}
        onClose={() => setShowSupabaseDashboard(false)}
        userId={currentUser?.id}
        bookmarksCount={bookmarks.length}
        notesCount={notes.length}
      />

      {/* Interactive User Help & Guidelines Modal */}
      <HelpGuideModal
        isOpen={showHelpGuide}
        onClose={() => setShowHelpGuide(false)}
      />
      
      {/* Footer credits */}
      <footer className="border-t border-stone-900 bg-stone-950 py-8 mt-16 text-center text-stone-500 text-xs font-mono shrink-0">
        <p>© 2026 Global High School Research Platform. Open-Access Academic Repository. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-stone-600">Licensed under Apache-2.0. Indexed via CrossRef DOIs & OpenAlex Academic API.</p>
      </footer>

    </div>
  );
}
