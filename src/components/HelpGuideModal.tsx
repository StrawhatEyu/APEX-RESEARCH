import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, HelpCircle, Sparkles, Terminal, Keyboard, BookOpen, Database, 
  Search, Cpu, Bookmark, HelpCircle as HelpIcon, Flame, Info
} from "lucide-react";

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Smooth Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
        >
          {/* Neon Top Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white bg-slate-950/40 hover:bg-slate-950/80 p-2 rounded-full transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="p-6 pb-2 flex items-center gap-3">
            <div className="w-11 h-11 bg-cyan-950/50 border border-cyan-800/40 rounded-xl flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-white leading-none flex items-center gap-2">
                APEX User Guide & Help
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase bg-cyan-950 border border-cyan-800/40 text-cyan-300">
                  Efficiency Manual
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-1.5">
                Learn how to search like a pro, access premium academic engines, and reveal hidden platform capabilities.
              </p>
            </div>
          </div>

          {/* Scrollable Core Guidelines */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Guide 1: Searching Efficiently */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                1. Professional Searching Tactics
              </h3>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4.5 space-y-3">
                <p className="text-xs text-stone-300 leading-relaxed">
                  APEX connects to <strong className="text-white">six top academic indexes simultaneously</strong> (arXiv, OpenAlex, Crossref, Semantic Scholar, Europe PMC, and PLOS). To execute professional searches:
                </p>
                <ul className="space-y-2 text-xs text-stone-400 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">•</span>
                    <span><strong className="text-stone-200">Use Academic & Dense Phrasing:</strong> Search for specific scientific concepts (e.g., <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">"Machine Learning optimization"</code> or <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">"CRISPR-Cas9 therapeutic delivery"</code>). Avoid conversational queries like <code className="bg-slate-900 px-1 py-0.5 rounded text-stone-500">"how does CRISPR work"</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">•</span>
                    <span><strong className="text-stone-200">Leverage the Curriculum Taxonomy:</strong> Click on any discipline card inside our <strong className="text-stone-300">Topic Explorer Curriculum Map</strong> on the Explore tab. This auto-applies advanced pre-scored keywords to instantly narrow down search spaces.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold mt-0.5">•</span>
                    <span><strong className="text-stone-200">Exact ID / DOI Searching:</strong> If you know the digital object identifier (DOI) or specific author, you can paste it directly into the search bar for an exact match.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Guide 2: Locating & Downloading PDFs */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                2. Finding & Downloading Original PDFs
              </h3>
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4.5 space-y-3">
                <p className="text-xs text-stone-300 leading-relaxed">
                  Due to publisher paywalls, strict subscription models, or CORS browser security policies, <strong className="text-white">certain research papers cannot be read or downloaded directly</strong> within our embedded player. When you encounter a locked paper, follow this master guide to locate the original and successfully download it:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-slate-900/60 border border-slate-800/60 p-3.5 rounded-xl space-y-1.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/40 flex items-center justify-center text-[10px] font-mono">1</span>
                      Tap the "Open Original Link" Key
                    </h4>
                    <p className="text-[11px] text-stone-400 leading-normal">
                      Every document card on APEX features an <strong className="text-stone-300">"Open Original Link"</strong> button. If the built-in reader is blank or restricted, clicking this takes you directly to the official publisher's portal (such as Elsevier, Springer, IEEE, or Nature) where the official PDF is hosted.
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/60 p-3.5 rounded-xl space-y-1.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/40 flex items-center justify-center text-[10px] font-mono">2</span>
                      Use the Copied DOI / Metadata
                    </h4>
                    <p className="text-[11px] text-stone-400 leading-normal">
                      Copy the unique <strong className="text-stone-300">Digital Object Identifier (DOI)</strong> or exact paper title from the dashboard. Paste this identifier into specialized academic search tools like <strong className="text-stone-300">Google Scholar</strong>, <strong className="text-stone-300">Unpaywall</strong>, or <strong className="text-stone-300">ResearchGate</strong> to easily locate legal, free-to-download open-access versions.
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/60 p-3.5 rounded-xl space-y-1.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/40 flex items-center justify-center text-[10px] font-mono">3</span>
                      Leverage Institutional & Proxy Logins
                    </h4>
                    <p className="text-[11px] text-stone-400 leading-normal">
                      For premium paywalled papers, open the publisher page via the original link and click <strong className="text-stone-300">"Sign in via institution"</strong>. Log in with your high school or university credentials to unlock immediate full-text download rights.
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800/60 p-3.5 rounded-xl space-y-1.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/40 flex items-center justify-center text-[10px] font-mono">4</span>
                      Try Alternate Multi-Source Mirroring
                    </h4>
                    <p className="text-[11px] text-stone-400 leading-normal">
                      APEX queries six independent indexes. If the link from Crossref or Semantic Scholar is gated, look at the duplicate search results to see if the preprint is indexed on <strong className="text-stone-300">arXiv</strong> or <strong className="text-stone-300">Europe PMC</strong>, which always host 100% free downloadable PDFs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guide 3: REVEAL HIDDEN FEATURES */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono text-amber-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
                  3. Unveiling Hidden Features & Dynamic Engines
                </h3>
              </div>
              
              <div className="border border-amber-500/20 bg-amber-950/10 rounded-2xl overflow-hidden p-4 space-y-4">
                <p className="text-xs text-stone-300 leading-relaxed">
                  We've built professional, advanced features right into the platform that are hidden from standard public views to keep the interface minimal and clean:
                </p>

                <div className="space-y-3">
                  {/* Shortcut 1: Live Fair Interleaving */}
                  <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">Six-Source Round Robin Interleaving</span>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Our backend runs a highly-sophisticated round-robin scheduling algorithm when matching papers, interleaving top-tier engines fairly. This guarantees that niche preprints from Europe PMC, PLOS, and arXiv are presented directly alongside high-impact publications.
                      </p>
                    </div>
                  </div>

                  {/* Shortcut 2: Gemini Smart Summary */}
                  <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">Intelligent Scientific Summarizer</span>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Clicking "Get AI Summary" on any paper commands our server-side Gemini 3.5 engine to digest the abstract and produce dense structural pillars. No API keys are requested from the browser—keeping credentials entirely safe.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1 font-mono">
              <Terminal className="w-3 h-3 text-cyan-400" />
              Verifying terminal shortcuts active
            </span>
            <span className="font-mono">v2.10.4-help</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
