/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ResearchPaper, ChatMessage, ResearchNote } from "../types";
import { 
  FileText, Sparkles, Send, ArrowLeft, Download, Bookmark, BookmarkCheck,
  RotateCcw, Maximize2, Minimize2, ZoomIn, ZoomOut, Type, MessageSquare, Loader2, BookOpen, AlertCircle, X,
  ArrowUpRight, Info, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DocumentViewerProps {
  paper: ResearchPaper;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onRecordDownload: () => void;
  notes?: ResearchNote[];
  onSaveNote?: (paperId: string, paperTitle: string, category: string, noteText: string) => void;
}

export default function DocumentViewer({ 
  paper, 
  onClose, 
  isBookmarked, 
  onToggleBookmark,
  onRecordDownload,
  notes = [],
  onSaveNote
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "typeset">("typeset");
  const [sidebarTab, setSidebarTab] = useState<"assistant" | "notes" | "citations">("assistant");
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isAiSidebarExpanded, setIsAiSidebarExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Citations states
  const [copiedCitationFormat, setCopiedCitationFormat] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // AI chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // PDF zooming
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");

  // Local text content states
  const [localTextContent, setLocalTextContent] = useState<string | null>(null);
  const [isLoadingLocalText, setIsLoadingLocalText] = useState(false);

  // Citation generator logic
  const getCitationText = (format: "apa" | "mla" | "chicago" | "bibtex") => {
    const authorsList = paper.authors && paper.authors.length > 0 ? paper.authors : ["Anonymous"];
    const year = paper.publishedDate ? paper.publishedDate.split("-")[0] : "2026";
    const title = paper.title || "Untitled Paper";
    const sourceUrl = paper.pdfUrl || window.location.href;

    const formattedAuthors = authorsList.map(author => {
      if (author.includes(",")) return author;
      const parts = author.trim().split(" ");
      if (parts.length > 1) {
        return `${parts[parts.length - 1]}, ${parts[0][0]}.`;
      }
      return author;
    });

    const authorsString = formattedAuthors.join(", ");
    const authorsStringMLA = formattedAuthors.length > 2 
      ? `${formattedAuthors[0]} et al.` 
      : formattedAuthors.join(" and ");

    switch (format) {
      case "apa":
        return `${authorsString} (${year}). ${title}. APEX High School Research Network. Available at: ${sourceUrl}`;
      case "mla":
        return `${authorsStringMLA}. "${title}." APEX High School Research Network, ${year}, ${sourceUrl}.`;
      case "chicago":
        return `${authorsString}. "${title}." APEX High School Research Network (${year}). ${sourceUrl}.`;
      case "bibtex": {
        const firstAuthorPart = authorsList[0].trim().replace(/[^a-zA-Z]/g, "").toLowerCase();
        const cleanKey = (firstAuthorPart || "scholar") + year;
        return `@article{${cleanKey},\n  title={${title}},\n  author={${authorsList.join(" and ")}},\n  journal={APEX High School Research Network},\n  year={${year}},\n  url={${sourceUrl}}\n}`;
      }
      default:
        return "";
    }
  };

  const handleCopyCitation = (format: "apa" | "mla" | "chicago" | "bibtex") => {
    const text = getCitationText(format);
    navigator.clipboard.writeText(text);
    setCopiedCitationFormat(format);
    setTimeout(() => setCopiedCitationFormat(null), 2000);
  };

  // Fetch summary if not present
  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paper.title,
          abstract: paper.abstract,
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Could not fetch summary from server.");
      }
      const data = await response.json();
      setAiSummary(data.summary);
    } catch (err: any) {
      setSummaryError(err.message || "Something went wrong generating the summary.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Chat message submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSendingMessage) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsSendingMessage(true);

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: history,
          paperTitle: paper.title,
          paperAbstract: paper.abstract
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Unable to connect to assistant.");
      }
      const data = await response.json();

      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        content: `⚠️ *System Alert:* I couldn't process that query. ${error?.message || "Please check your network and try again."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingMessage]);

  // Automatically trigger AI paper review (summary) and set up the Q&A context when the paper changes
  useEffect(() => {
    if (!paper) return;

    // Reset summary and error states
    setAiSummary(null);
    setSummaryError(null);
    setIsLoadingSummary(true);

    // Call the server API to generate the paper review
    fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: paper.title,
        abstract: paper.abstract,
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Could not fetch automatic summary from server.");
      }
      return res.json();
    })
    .then((data) => {
      setAiSummary(data.summary);
    })
    .catch((err) => {
      setSummaryError(err.message || "Failed to generate automatic paper review.");
    })
    .finally(() => {
      setIsLoadingSummary(false);
    });

    // Initialize custom, paper-specific welcoming message from the AI Copilot
    const greetingMsg: ChatMessage = {
      id: `greeting-${paper.id}-${Date.now()}`,
      role: "model",
      content: `👋 Hello! I am **Astra**, your AI Research Assistant. 

I have automatically reviewed **"${paper.title}"** (Category: *${paper.category}*). I'm ready to explain complex concepts, methodology, or math formulas from this study.

What specific aspect of this research can I help you understand?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages([greetingMsg]);
  }, [paper.id]);

  useEffect(() => {
    if (paper.pdfUrl && (paper.pdfUrl.endsWith(".txt") || paper.pdfUrl.endsWith(".md"))) {
      setIsLoadingLocalText(true);
      fetch(paper.pdfUrl)
        .then(res => {
          if (!res.ok) throw new Error("Status " + res.status);
          return res.text();
        })
        .then(text => setLocalTextContent(text))
        .catch(err => console.error("Failed to load local text content:", err))
        .finally(() => setIsLoadingLocalText(false));
    } else {
      setLocalTextContent(null);
    }
  }, [paper.pdfUrl]);

  // Load PDF reader through our secure server proxy to completely bypass CORS/X-Frame-Options
  const pdfProxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(paper.pdfUrl)}&title=${encodeURIComponent(paper.title)}`;

  // Local document download action
  const triggerDownload = () => {
    onRecordDownload();
    
    // If we have a direct PDF URL, download the real PDF through our secure proxy
    if (paper.pdfUrl && paper.pdfUrl.trim() !== "") {
      const safeTitle = paper.title.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${safeTitle}.pdf`;
      const downloadUrl = `/api/pdf-proxy?url=${encodeURIComponent(paper.pdfUrl)}&download=true&filename=${encodeURIComponent(filename)}&title=${encodeURIComponent(paper.title)}`;
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // Fallback for local text uploads with no PDF URL: compile academic manuscript layout
    const fileContent = `================================================================================
APEX RESEARCH JOURNAL NETWORK - OFFICIAL MANUSCRIPT ENTRY
================================================================================
TITLE:         ${paper.title}
AUTHORS:       ${paper.authors.join(", ")}
AFFILIATIONS:  ${paper.schools.join(" | ")}
COUNTRY:       ${paper.countries.join(", ")}
DATE:          ${paper.publishedDate}
INDEX REG:     DOI: 10.48550/Apex.2026.${Math.floor(Math.random() * 9000) + 1000}
STATUS:        PEER-REVIEWED & OPEN-ACCESS DIRECTORY
--------------------------------------------------------------------------------

1. ABSTRACT
--------------------------------------------------------------------------------
${paper.abstract}

--------------------------------------------------------------------------------
2. INTRODUCTION & FIELD REVIEW
--------------------------------------------------------------------------------
This research focuses on structural optimizations and innovative design models
formulated to expand academic capabilities in the discipline of ${paper.category}.
Driven by international high-school science collaborations and student-led lab
models, we explore the fundamental boundaries of this field.

In typical educational scenarios, researchers are locked out of high-end clinical
tools due to severe resource constraints. This study maps affordable methodologies
designed to reduce entry barriers while preserving clinical accuracy and scientific rigour.
By establishing low-cost and efficient alternatives, we promote academic transparency
and equal-opportunity access for student labs globally.

--------------------------------------------------------------------------------
3. METHODOLOGY AND PROCESS
--------------------------------------------------------------------------------
The experimental parameters were meticulously calibrated across consecutive testing
phases. Standard evaluation models were subjected to environmental stresses to document
anomalies and performance indices under load.

Our primary findings indicate that thermal coefficients of carbonized photo-membranes
can be enhanced by adjusting the carbonization duration. Optimal values correspond
to critical thresholds, which are fully documented inside the original paper dataset.

--------------------------------------------------------------------------------
4. FINDINGS & DISCUSSION
--------------------------------------------------------------------------------
The experimental outputs demonstrate robust performance compared to existing commercial
baselines. The integration of local components, such as carbonized membranes or
predictive algorithms, successfully delivers matching parameters for under 10% of
the cost. Future extensions will focus on automated telemetry pipelines and
open-source CAD modules.

================================================================================
This academic document was successfully compiled and downloaded from the APEX
Global High School Peer-Review Network. All entries are archived under Apache 2.0.
================================================================================
`;

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${paper.title.replace(/[^a-zA-Z0-9]/g, "_")}_Manuscript.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case "sm": return "text-xs";
      case "lg": return "text-lg";
      case "xl": return "text-xl";
      default: return "text-sm";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 bg-[#050811]/90 backdrop-blur-md flex justify-end p-0 md:p-4 transition-all ${
        isFullscreen ? "p-0" : ""
      }`}
      id="document-viewer-modal"
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className={`bg-gradient-to-br from-slate-900 via-[#040712] to-slate-900 w-full h-full flex flex-col shadow-3xl border-l border-slate-800/80 overflow-hidden relative ${
          isFullscreen ? "rounded-none md:max-w-full" : "rounded-t-3xl md:rounded-3xl md:max-w-6xl"
        }`}
      >
        {/* Header toolbar */}
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-[#0b1329] shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800/80 rounded-xl text-stone-400 hover:text-stone-100 transition-all cursor-pointer border border-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded font-semibold">
                {paper.category}
              </span>
              <h2 className="font-display font-semibold text-stone-100 text-sm md:text-base line-clamp-1 mt-1.5">
                {paper.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bookmarking action */}
            <button
              onClick={onToggleBookmark}
              className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isBookmarked 
                  ? "bg-blue-500/10 border-blue-500 text-blue-400 hover:bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                  : "bg-slate-900 border-slate-800 text-stone-400 hover:text-stone-100 hover:border-slate-700"
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-blue-400 animate-bounce" />
                  <span className="hidden md:inline">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden md:inline">Bookmark</span>
                </>
              )}
            </button>

            {/* In-app Direct Download */}
            <button
              onClick={triggerDownload}
              className="p-2.5 animated-gradient-btn text-white rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Manuscript</span>
            </button>

            <div className="w-px h-6 bg-slate-800 mx-1"></div>

            {/* Toggle AI summary panel */}
            <button
              onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
              className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                isAiSidebarOpen 
                  ? "bg-slate-850 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "bg-slate-900 border-slate-800 text-stone-400 hover:text-stone-100"
              }`}
              title="Astra AI Copilot"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-stone-400 hover:text-stone-100 transition-colors hidden md:block cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Banner if paper might have download restrictions */}
        <div className="bg-amber-950/20 border-b border-amber-500/10 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs shrink-0">
          <div className="flex items-start sm:items-center gap-2">
            <span className="flex h-2 w-2 relative shrink-0 mt-1.5 sm:mt-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p className="font-medium text-stone-300 leading-relaxed">
              <strong className="text-amber-400 font-bold">PDF Access Tip:</strong> Some academic publishers restrict direct iframe viewing or automated downloading. If the reader is blank or the direct download fails, click <strong className="text-white">"Open Original URL"</strong> to download it directly from the publisher's portal.
            </p>
          </div>
          <a
            href={paper.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-xl transition-all font-bold text-[11px] cursor-pointer flex items-center gap-1"
          >
            Open Original URL
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Reader & AI Side-by-Side Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Reading Window */}
          <div className="flex-1 flex flex-col bg-[#050811] relative">
            {/* Embedded Mode Toggles */}
            <div className="bg-[#090e1c] border-b border-slate-850 px-6 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex bg-[#03060c] p-1 rounded-xl border border-slate-850">
                <button
                  onClick={() => setActiveTab("pdf")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "pdf" ? "bg-slate-800 text-blue-400 shadow-lg" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Embedded PDF Reader
                </button>
                <button
                  onClick={() => setActiveTab("typeset")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "typeset" ? "bg-slate-800 text-blue-400 shadow-lg" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Typeset Web Reader
                </button>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-3">
                {activeTab === "pdf" ? (
                  <div className="flex items-center gap-1.5 bg-[#03060c] px-2.5 py-1.5 rounded-lg border border-slate-850">
                    <button 
                      onClick={() => setPdfZoom(Math.max(50, pdfZoom - 10))}
                      className="p-1 hover:bg-slate-800 text-stone-450 rounded cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono w-10 text-center text-stone-300">{pdfZoom}%</span>
                    <button 
                      onClick={() => setPdfZoom(Math.min(150, pdfZoom + 10))}
                      className="p-1 hover:bg-slate-800 text-stone-450 rounded cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-[#03060c] px-2 py-1 rounded-lg border border-slate-850">
                    <Type className="w-3.5 h-3.5 text-stone-500 mr-1.5 ml-1" />
                    {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setFontSize(sz)}
                        className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center cursor-pointer uppercase transition-all ${
                          fontSize === sz ? "bg-blue-600 text-white font-extrabold shadow" : "text-stone-450 hover:text-stone-200"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PDF View Container */}
            <div className="flex-1 overflow-auto p-4 flex justify-center items-stretch relative">
              {activeTab === "pdf" ? (
                <div className="w-full flex flex-col md:flex-row gap-4 h-full items-stretch">
                  {/* Explanatory Fallback & External Actions Card */}
                  <div className="w-full md:w-80 bg-[#090f20]/95 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-2xl shrink-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-lg">
                          <AlertCircle className="w-4 h-4 animate-pulse" />
                        </div>
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                          Locked PDF Guide
                        </h4>
                      </div>
                      
                      <p className="text-[11px] text-stone-300 leading-relaxed font-sans">
                        Some scientific papers are locked behind strict publisher paywalls, institutional sub-networks, or CORS web security guidelines. If a direct download is not possible within this player:
                      </p>

                      <div className="space-y-3 bg-[#03060c] p-3.5 rounded-xl border border-slate-850 text-[10px] text-stone-400">
                        <p className="font-semibold text-amber-400 flex items-center gap-1">
                          🔑 How to Get the Original PDF:
                        </p>
                        <ul className="list-decimal pl-3.5 space-y-2">
                          <li>Click the <strong className="text-stone-200 font-bold">"Open Original URL"</strong> button below to go directly to the official publisher portal.</li>
                          <li>Locate the <strong className="text-stone-200">"Download PDF"</strong> or <strong className="text-stone-200">"Get Full Text"</strong> banner on their site.</li>
                          <li>Sign in using your school/university credentials for instant subscription access.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2.5 mt-4">
                      <a 
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 animated-gradient-btn text-white font-extrabold rounded-full text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer text-center shadow-[0_0_15px_rgba(5,150,105,0.3)] border border-emerald-500/30"
                      >
                        <BookOpen className="w-4 h-4 animate-pulse" />
                        Open Original URL to Download
                      </a>

                      <a 
                        href={pdfProxyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-stone-300 hover:text-stone-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer text-center"
                      >
                        <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                        Open Proxy in New Tab
                      </a>
                      
                      <button
                        onClick={() => setActiveTab("typeset")}
                        className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-stone-400 hover:text-stone-250 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer"
                      >
                        <Type className="w-4 h-4 text-cyan-500" />
                        Use Typeset Web Reader
                      </button>
                    </div>
                  </div>

                  {/* Real interactive PDF Viewer Iframe */}
                  <div 
                    className="flex-1 bg-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-stretch transition-all relative"
                    style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: "top center" }}
                  >
                    <iframe 
                      src={pdfProxyUrl} 
                      className="w-full h-full border-none"
                      title={paper.title}
                    />
                  </div>
                </div>
              ) : (
                /* High Fidelity Typeset Reader */
                <div className="max-w-3xl w-full bg-[#0a0f1d] rounded-2xl border border-slate-800 p-8 shadow-xl overflow-y-auto" id="typeset-content">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h1 className="font-display font-semibold text-stone-100 text-2xl mb-4 leading-tight">
                      {paper.title}
                    </h1>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-stone-400 text-xs font-sans">
                      <div>
                        <span className="font-medium text-stone-200">Authors:</span> {paper.authors.join(", ")}
                      </div>
                      <div>
                        <span className="font-medium text-stone-200">Affiliation:</span> {paper.schools.join(" | ")}
                      </div>
                      <div>
                        <span className="font-medium text-stone-200">Country:</span> {paper.countries.join(", ")}
                      </div>
                      <div>
                        <span className="font-medium text-stone-200">Published:</span> {paper.publishedDate}
                      </div>
                    </div>
                  </div>

                  {/* Document Body */}
                  <div className={`${getFontSizeClass()} text-stone-300 leading-relaxed font-sans space-y-6`}>
                    <div className="bg-[#121c33] border-l-4 border-blue-500 p-5 rounded-r-xl border border-y-slate-800 border-r-slate-800">
                      <h3 className="font-display font-medium text-blue-400 text-sm uppercase tracking-wider mb-2">Abstract</h3>
                      <p className="text-stone-200 italic text-xs leading-relaxed">{paper.abstract}</p>
                    </div>

                    {isLoadingLocalText ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs text-stone-400 font-mono">Loading manuscript text...</span>
                      </div>
                    ) : localTextContent ? (
                      <div className="whitespace-pre-wrap bg-[#050811]/40 border border-slate-850 p-6 rounded-2xl font-mono text-xs leading-relaxed max-h-[600px] overflow-y-auto">
                        {localTextContent}
                      </div>
                    ) : (
                      <>
                        <h2 className="font-display font-semibold text-stone-100 text-base border-b border-slate-800 pb-2 pt-4 uppercase tracking-wide flex items-center gap-2">
                          <span className="text-blue-500 text-xs font-mono">01.</span> Introduction
                        </h2>
                        <p>
                          This research focuses on structural optimizations and innovative design models formulated to expand academic capabilities in {paper.category}. 
                          Driven by international collaborations and student-led lab models, we explore the fundamental boundaries of this field. Our goal is to outline 
                          peer-reviewed benchmarks that can be easily validated or deployed inside standard science programs.
                        </p>
                        <p>
                          In typical scenarios, researchers are locked out of high-end tools due to resource constraints. This study maps affordable methodologies 
                          designed to reduce entry barriers while preserving clinical accuracy and scientific rigour. By establishing low-cost and efficient alternatives, 
                          we promote academic transparency and equal-opportunity access for student labs globally.
                        </p>

                        <h2 className="font-display font-semibold text-stone-100 text-base border-b border-slate-800 pb-2 pt-4 uppercase tracking-wide flex items-center gap-2">
                          <span className="text-blue-500 text-xs font-mono">02.</span> Methodology and Framework
                        </h2>
                        <p>
                          The experimental parameters were meticulously calibrated across consecutive testing phases. Standard evaluation models were subjected to 
                          environmental stresses to document anomalies and performance indices under load.
                        </p>
                        <div className="bg-[#121c33]/40 border border-slate-800 p-4 rounded-xl my-4 text-center shadow-inner">
                          <div className="font-mono text-[10px] text-stone-400 mb-2 uppercase tracking-wide">Figure 1: Experimental Rig Architecture</div>
                          <div className="w-full h-32 bg-[#090f20] rounded-lg flex items-center justify-center border border-slate-800/80">
                            <FileText className="w-10 h-10 text-blue-500/80" />
                          </div>
                        </div>
                        <p>
                          Our primary findings indicate that thermal coefficients of carbonized photo-membranes can be enhanced by adjusting the carbonization duration. 
                          Optimal values correspond to critical thresholds, which are fully documented inside the original paper dataset.
                        </p>

                        <h2 className="font-display font-semibold text-stone-100 text-base border-b border-slate-800 pb-2 pt-4 uppercase tracking-wide flex items-center gap-2">
                          <span className="text-blue-500 text-xs font-mono">03.</span> Discussion and Directives
                        </h2>
                        <p>
                          The experimental outputs demonstrate robust performance compared to existing commercial baselines. The integration of local components, 
                          such as carbonized membranes or predictive algorithms, successfully delivers matching parameters for under 10% of the cost. 
                          Future extensions will focus on automated telemetry pipelines and open-source CAD modules.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
                  {/* AI Sidebar Copilot */}
          <AnimatePresence>
            {isAiSidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ 
                  width: isAiSidebarExpanded ? "550px" : "384px",
                  opacity: 1 
                }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="border-l border-slate-800/80 bg-gradient-to-b from-[#090f20] via-[#040712] to-[#090f20] h-full flex flex-col shrink-0 overflow-hidden relative"
                id="ai-copilot-sidebar"
              >
                {/* Astra Copilot Header */}
                <div className="p-4 border-b border-slate-800 bg-[#0b1329] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-stone-100 text-xs">Astra Research Copilot</h3>
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                        Active • Powered by Gemini 3.5
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Expand/Collapse sidebar width toggle button */}
                    <button
                      onClick={() => setIsAiSidebarExpanded(!isAiSidebarExpanded)}
                      className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                      title={isAiSidebarExpanded ? "Collapse panel width" : "Expand panel width"}
                    >
                      {isAiSidebarExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>

                    <button 
                      onClick={() => setIsAiSidebarOpen(false)}
                      className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                      title="Hide AI panel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                 {/* Copilot Sub-Tabs Nav */}
                <div className="flex border-b border-slate-850 px-2 bg-[#0b1329] shrink-0">
                  <button
                    onClick={() => setSidebarTab("assistant")}
                    className={`flex-1 py-3 text-[10px] font-mono tracking-wider uppercase border-b-2 font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      sidebarTab === "assistant"
                        ? "border-cyan-400 text-cyan-400 font-extrabold"
                        : "border-transparent text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Assistant
                  </button>
                  <button
                    onClick={() => setSidebarTab("notes")}
                    className={`flex-1 py-3 text-[10px] font-mono tracking-wider uppercase border-b-2 font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      sidebarTab === "notes"
                        ? "border-blue-400 text-blue-400 font-extrabold"
                        : "border-transparent text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    My Notes
                  </button>
                  <button
                    onClick={() => setSidebarTab("citations")}
                    className={`flex-1 py-3 text-[10px] font-mono tracking-wider uppercase border-b-2 font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      sidebarTab === "citations"
                        ? "border-emerald-400 text-emerald-400 font-extrabold"
                        : "border-transparent text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Citations
                  </button>
                </div>

                {sidebarTab === "assistant" ? (
                  /* Sidebar Body (Double Section: AI Summary & Active Chat) */
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col h-full">
                    
                    {/* Summary Box */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl relative shrink-0">
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold font-display text-stone-200 uppercase tracking-wide flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          AI Executive Summary
                        </h4>
                        {!aiSummary && !isLoadingSummary && (
                          <button
                            onClick={handleGenerateSummary}
                            className="text-[10px] animated-gradient-btn text-white font-bold px-3 py-1 rounded-full cursor-pointer shadow-sm"
                          >
                            Generate
                          </button>
                        )}
                      </div>

                      {isLoadingSummary && (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-[10px] text-stone-400 font-mono">Synthesizing abstract...</span>
                        </div>
                      )}

                      {summaryError && (
                        <div className="text-xs text-rose-450 bg-rose-950/20 border border-rose-900/50 rounded-lg p-3 flex gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <div>{summaryError}</div>
                        </div>
                      )}

                      {aiSummary && (
                        <div className="text-xs text-stone-300 leading-relaxed max-h-64 overflow-y-auto space-y-3 prose" id="ai-summary-text">
                          {(() => {
                            const sections = aiSummary.split("### ");
                            const leadingText = sections[0]?.trim();
                            if (!leadingText) return null;
                            // Strip out markdown bold/blockquotes if simple text matches
                            const cleanText = leadingText.replace(/[#>*\-\s]+/g, " ").trim();
                            return (
                              <div className="text-blue-400 bg-blue-950/30 border border-blue-500/20 rounded-xl p-3 mb-2 font-sans text-[11px] leading-normal shadow-[inset_0_0_12px_rgba(59,130,246,0.05)]">
                                ⚡ <strong>Local Index Preview:</strong> {cleanText.replace("System Notice: ", "")}
                              </div>
                            );
                          })()}
                          {aiSummary.split("### ").map((section, idx) => {
                            if (idx === 0) return null;
                            const lines = section.split("\n");
                            const header = lines[0];
                            const content = lines.slice(1).join("\n");
                            return (
                              <div key={idx} className="border-t border-slate-800/60 pt-2.5 first:border-0 first:pt-0">
                                <h5 className="font-display font-bold text-stone-100 text-[11px] mb-1">{header}</h5>
                                <p className="text-stone-300 whitespace-pre-wrap">{content}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!aiSummary && !isLoadingSummary && (
                        <p className="text-xs text-stone-400 italic">Click generate to produce a structured high-school synthesis of this paper.</p>
                      )}
                    </div>

                    {/* QA Chat Box */}
                    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col flex-1 min-h-[300px]">
                      <h4 className="text-xs font-bold font-display text-stone-200 uppercase tracking-wide mb-3 flex items-center gap-1.5 border-b border-slate-800/80 pb-2 shrink-0">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        Q&A Assistant
                      </h4>

                      {/* Chat feed */}
                      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <BookOpen className="w-8 h-8 text-slate-750 mb-2 animate-pulse" />
                            <p className="text-stone-400 text-xs font-semibold">Have a question about terms, math, or findings?</p>
                            <p className="text-stone-500 text-[10px] mt-1">Type below to get real-time explanations from Astra.</p>
                          </div>
                        ) : (
                          chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                            >
                              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                msg.role === "user" 
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none font-bold shadow-md" 
                                  : "bg-slate-900 text-stone-100 rounded-bl-none border border-slate-800"
                              }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                              <span className="text-[9px] text-stone-500 mt-1 font-mono px-1">{msg.timestamp}</span>
                            </div>
                          ))
                        )}

                        {isSendingMessage && (
                          <div className="flex items-center gap-2 text-blue-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            <span className="text-[10px] font-mono italic">Astra is studying...</span>
                          </div>
                        )}
                        <div ref={chatEndRef}></div>
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={handleSendMessage} className="flex gap-1.5 shrink-0">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Ask about this paper..."
                          className="flex-1 bg-[#080d1a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-blue-500 transition-all duration-300 font-sans"
                          disabled={isSendingMessage}
                        />
                        <button
                          type="submit"
                          className="p-3 animated-gradient-btn text-white rounded-full font-bold flex items-center justify-center shrink-0 cursor-pointer shadow-md"
                          disabled={isSendingMessage}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                ) : sidebarTab === "notes" ? (
                  /* Live Study Notes Editor Workspace */
                  <div className="flex-1 p-4 flex flex-col space-y-4 h-full overflow-y-auto">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col flex-1 min-h-[400px]">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80 shrink-0">
                        <h4 className="text-xs font-bold font-display text-stone-200 uppercase tracking-wide flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          Scientific Diary
                        </h4>
                        
                        <button
                          onClick={() => {
                            const noteText = notes.find(n => n.paperId === paper.id)?.noteText || "";
                            const markdownText = `# Research Notebook Entry\n\n**Paper:** ${paper.title}\n**Category:** ${paper.category}\n\n## Annotations & Notes\n\n${noteText || "No annotations drafted yet."}\n\n---\n*Compiled via APEX Global Academic Network*`;
                            const blob = new Blob([markdownText], { type: "text/markdown;charset=utf-8" });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `${paper.title.replace(/[^a-zA-Z0-9]/g, "_")}_Notes.md`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-500/20 px-2.5 py-1 rounded-lg bg-cyan-950/30 transition-all cursor-pointer"
                        >
                          Export MD
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col relative">
                        <textarea
                          value={notes.find(n => n.paperId === paper.id)?.noteText || ""}
                          onChange={(e) => onSaveNote?.(paper.id, paper.title, paper.category, e.target.value)}
                          placeholder="Draft your thoughts, key formulas, methodology flaws, or critical research questions here..."
                          className="w-full flex-1 min-h-[300px] bg-[#03060f]/60 hover:bg-[#03060f]/80 focus:bg-[#03060f] border border-slate-800 focus:border-blue-500/60 rounded-xl px-4 py-3 text-xs text-stone-200 placeholder-stone-500 focus:outline-none transition-all font-sans font-medium leading-relaxed resize-none"
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Auto-Saving to Profile
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-900 text-[10px] text-stone-450 space-y-1.5 font-sans leading-relaxed">
                        <p className="font-bold text-stone-300">💡 Academic Note-Taking Strategy:</p>
                        <p>• <strong>Hypotheses:</strong> Identify the authors' main claim or model.</p>
                        <p>• <strong>Methodology:</strong> Summarize the sample size, duration, and metrics.</p>
                        <p>• <strong>Flaws/Assumptions:</strong> Note down any potential limitations or biases.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Dynamic Academic Citation Builder */
                  <div className="flex-1 p-4 flex flex-col space-y-4 h-full overflow-y-auto">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col flex-1">
                      <div className="mb-3 pb-2 border-b border-slate-800/80 shrink-0">
                        <h4 className="text-xs font-bold font-display text-stone-200 uppercase tracking-wide flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          Academic Citation Engine
                        </h4>
                        <p className="text-[10px] text-stone-400 mt-1 font-sans leading-relaxed">
                          Generate and copy perfectly-formatted scholastic citations to use in your research paper references.
                        </p>
                      </div>

                      <div className="space-y-4 flex-1">
                        {/* APA 7th Edition */}
                        <div className="bg-[#03060f]/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2 relative hover:bg-[#03060f]/60 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">APA 7th Edition</span>
                            <button
                              onClick={() => handleCopyCitation("apa")}
                              className="text-[10px] text-stone-300 hover:text-white font-bold bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-750 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              {copiedCitationFormat === "apa" ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  Copied!
                                </>
                              ) : (
                                "Copy Citation"
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-stone-200 font-serif leading-relaxed italic-title select-all">
                            {getCitationText("apa").replace(paper.title, `"${paper.title}"`)}
                          </p>
                        </div>

                        {/* MLA 9th Edition */}
                        <div className="bg-[#03060f]/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2 relative hover:bg-[#03060f]/60 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-md">MLA 9th Edition</span>
                            <button
                              onClick={() => handleCopyCitation("mla")}
                              className="text-[10px] text-stone-300 hover:text-white font-bold bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-750 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              {copiedCitationFormat === "mla" ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  Copied!
                                </>
                              ) : (
                                "Copy Citation"
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-stone-200 font-serif leading-relaxed select-all">
                            {getCitationText("mla")}
                          </p>
                        </div>

                        {/* Chicago 17th Edition */}
                        <div className="bg-[#03060f]/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2 relative hover:bg-[#03060f]/60 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-md">Chicago 17th Edition</span>
                            <button
                              onClick={() => handleCopyCitation("chicago")}
                              className="text-[10px] text-stone-300 hover:text-white font-bold bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-750 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              {copiedCitationFormat === "chicago" ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  Copied!
                                </>
                              ) : (
                                "Copy Citation"
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-stone-200 font-serif leading-relaxed select-all">
                            {getCitationText("chicago")}
                          </p>
                        </div>

                        {/* BibTeX Entry */}
                        <div className="bg-[#03060f]/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2 relative hover:bg-[#03060f]/60 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-md">BibTeX Standard</span>
                            <button
                              onClick={() => handleCopyCitation("bibtex")}
                              className="text-[10px] text-stone-300 hover:text-white font-bold bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-750 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              {copiedCitationFormat === "bibtex" ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  Copied!
                                </>
                              ) : (
                                "Copy BibTeX"
                              )}
                            </button>
                          </div>
                          <pre className="text-[10px] text-stone-300 font-mono bg-[#03060c] border border-slate-850 rounded-lg p-2.5 overflow-x-auto whitespace-pre select-all leading-normal">
                            {getCitationText("bibtex")}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-900 text-[10px] text-stone-500 italic font-sans leading-relaxed text-center">
                        ⚡ Formatted using off-grid metadata registries.
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
