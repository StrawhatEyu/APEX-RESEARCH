/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ResearchPaper } from "../types";
import { SYNDICATED_SITES } from "../data";
import { Globe, Terminal, Code2, Link, RefreshCw, Layers, ShieldCheck, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SyndicationShowcaseProps {
  papers: ResearchPaper[];
  onReadPaper: (paper: ResearchPaper) => void;
}

export default function SyndicationShowcase({ papers, onReadPaper }: SyndicationShowcaseProps) {
  const [activeSiteId, setActiveSiteId] = useState<string>("site-quantum");
  const [simulatedQueryTime, setSimulatedQueryTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const activeSite = SYNDICATED_SITES.find((s) => s.id === activeSiteId) || SYNDICATED_SITES[0];

  // Filter papers for each site to simulate real topic syndication
  const getSitePapers = (siteId: string) => {
    switch (siteId) {
      case "site-quantum":
        // Only physics, cosmology, quantum computing
        return papers.filter(
          (p) => 
            p.category.includes("Quantum") || 
            p.category.includes("Astrophysics") || 
            p.category.includes("Physics")
        );
      case "site-biotech":
        // Only biotech, genetics, environment
        return papers.filter(
          (p) => 
            p.category.includes("Biotechnology") || 
            p.category.includes("Environmental")
        );
      case "site-stem":
        // Showcase all latest student publications
        return papers;
      default:
        return papers;
    }
  };

  const activeSitePapers = getSitePapers(activeSiteId);

  // Trigger simulated loader when site switches
  useEffect(() => {
    setIsRefreshing(true);
    const start = performance.now();
    const timer = setTimeout(() => {
      setSimulatedQueryTime(Math.round(performance.now() - start + 12));
      setIsRefreshing(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeSiteId, papers]);

  return (
    <div className="w-full space-y-8" id="syndication-showcase">
      {/* Intro and partner cards */}
      <div className="bg-gradient-to-br from-[#020617]/40 via-[#0f172a]/35 to-[#1e1b4b]/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="max-w-3xl">
          <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded font-semibold">
            API & Syndication Network
          </span>
          <h2 className="font-display font-bold text-stone-100 text-lg md:text-xl mt-3">
            Cross-Platform Data Syndication
          </h2>
          <p className="text-stone-350 text-xs mt-1.5 leading-relaxed">
            Our platform features an open-access endpoint (`GET /api/papers`) allowing external educational bodies to syndicate our student publications. 
            Below are <strong className="text-blue-400 font-bold">three different independent websites</strong> actively pulling data live from our platform's research database. Watch how they query and style our records dynamically.
          </p>
        </div>

        {/* Site selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {SYNDICATED_SITES.map((site) => {
            const isSelected = site.id === activeSiteId;
            return (
              <button
                key={site.id}
                onClick={() => setActiveSiteId(site.id)}
                className={`p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between hover:shadow-2xl cursor-pointer ${
                  isSelected 
                    ? "bg-[#060315] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.18)] transform scale-[1.02]" 
                    : "bg-[#03060c]/40 border-slate-850 hover:border-cyan-500/50 hover:bg-[#060315]/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)] text-stone-300 scale-[0.99] hover:scale-[1.005]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold font-display ${isSelected ? "text-blue-400" : "text-stone-200"}`}>{site.name}</span>
                    <Globe className={`w-3.5 h-3.5 ${isSelected ? "text-blue-500" : "text-stone-550"}`} />
                  </div>
                  <p className="text-[11px] text-stone-500 font-mono">{site.domain}</p>
                  <p className="text-[11px] text-stone-450 mt-2 line-clamp-2 leading-normal">
                    {site.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between w-full">
                  <span className="text-[10px] bg-[#03060c] text-stone-400 px-2 py-0.5 rounded-full font-mono font-medium border border-slate-800">
                    {site.theme.replace("-", " ")} theme
                  </span>
                  <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: site.accentColor }}>
                    Fetch {getSitePapers(site.id).length} papers
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sandbox Window & API Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Simulated Website Viewport */}
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl p-3 shadow-2xl border-4 border-slate-800">
          
          {/* Simulated Browser Bar */}
          <div className="px-4 py-2 bg-gradient-to-r from-slate-900 to-[#040712] flex items-center gap-2 border-b border-slate-800 rounded-t-2xl shrink-0">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
            </div>
            <div className="flex-1 max-w-md bg-slate-950 border border-slate-850 rounded-md px-3 py-1 flex items-center justify-between mx-auto">
              <div className="flex items-center gap-1.5 text-stone-500">
                <span className="text-[10px] text-emerald-500 font-bold">https://</span>
                <span className="text-[10px] text-stone-300 font-mono">{activeSite.domain}/publications</span>
              </div>
              <RefreshCw className={`w-3 h-3 text-stone-500 ${isRefreshing ? "animate-spin" : ""}`} />
            </div>
          </div>

          {/* Render Active Site Sandbox */}
          <div className="bg-white h-[450px] overflow-y-auto p-6 relative" id="simulated-website-body">
            
            {/* 1. Cyberpunk Brutalist Theme */}
            {activeSite.theme === "brutalist" && (
              <div className="font-mono text-stone-900 h-full">
                <div className="border-4 border-black p-4 mb-6 bg-amber-300 flex justify-between items-center">
                  <h1 className="font-bold text-base uppercase tracking-wider">⚡ {activeSite.name}</h1>
                  <span className="text-xs bg-black text-white px-2 py-1">LIVE FEED</span>
                </div>

                {isRefreshing ? (
                  <div className="h-48 flex items-center justify-center">
                    <span className="text-xs uppercase border-2 border-black p-2 animate-pulse bg-stone-100">QUERYING ENDPOINT...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {activeSitePapers.map((paper) => (
                      <div key={paper.id} className="border-4 border-black p-4 bg-white hover:bg-stone-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5">
                        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                          <span className="text-[10px] bg-black text-white px-1.5 font-mono">{paper.category}</span>
                          <span className="text-[10px] text-stone-500 font-mono">{paper.publishedDate}</span>
                        </div>
                        <h3 className="font-bold text-sm leading-snug text-black uppercase mb-1">{paper.title}</h3>
                        <p className="text-[11px] text-stone-700 leading-normal mb-3 font-sans font-medium">By {paper.authors.join(", ")} | {paper.schools[0]}</p>
                        <p className="text-[11px] text-stone-600 line-clamp-2 mb-4 leading-relaxed font-sans">{paper.abstract}</p>
                        <button
                          onClick={() => onReadPaper(paper)}
                          className="px-3 py-1 bg-amber-400 text-black border-2 border-black font-bold text-xs uppercase hover:bg-amber-300 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          OPEN DOCUMENT ↗
                        </button>
                      </div>
                    ))}
                    {activeSitePapers.length === 0 && (
                      <div className="border-2 border-dashed border-black p-8 text-center text-xs">
                        NO PAPERS FOUND MATCHING CRITERIA.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Science Lab Clean Theme */}
            {activeSite.theme === "science-lab" && (
              <div className="font-sans text-stone-800 h-full">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <h1 className="font-display font-bold text-stone-900 text-base">{activeSite.name}</h1>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200">BioSyndicate v2.4</span>
                </div>

                {isRefreshing ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                      <span className="text-[10px] font-mono text-stone-500">Negotiating schema validation...</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSitePapers.map((paper) => (
                      <div key={paper.id} className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-400 transition-colors">
                        <div>
                          <div className="text-[9px] text-emerald-600 font-mono uppercase font-semibold mb-1">{paper.category}</div>
                          <h3 className="font-display font-semibold text-xs text-stone-950 mb-1 leading-normal line-clamp-2">{paper.title}</h3>
                          <p className="text-[10px] text-stone-500 font-mono mb-2">Lab: {paper.authors[0]} (Int'l High School)</p>
                          <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed mb-4">{paper.abstract}</p>
                        </div>
                        <button
                          onClick={() => onReadPaper(paper)}
                          className="w-full py-1.5 text-center text-[11px] bg-white border border-stone-200 rounded-lg hover:border-emerald-500 hover:text-emerald-700 font-medium transition-all cursor-pointer"
                        >
                          View Bio-Resource
                        </button>
                      </div>
                    ))}
                    {activeSitePapers.length === 0 && (
                      <div className="col-span-2 border border-dashed border-stone-200 rounded-xl p-8 text-center text-xs text-stone-400">
                        No genetics or eco papers loaded in syndication.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. School News Bulletin Theme */}
            {activeSite.theme === "school-bulletin" && (
              <div className="font-serif text-stone-900 h-full">
                <div className="text-center border-b-4 border-double border-stone-800 pb-3 mb-6">
                  <h1 className="font-display font-semibold text-xl tracking-tight text-stone-950">{activeSite.name}</h1>
                  <p className="text-[10px] font-mono tracking-widest uppercase text-stone-500 mt-1">Global Consortium Daily • Published Internationally</p>
                </div>

                {isRefreshing ? (
                  <div className="h-48 flex items-center justify-center">
                    <span className="text-xs font-serif italic text-stone-500">Querying national registers...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeSitePapers.map((paper) => (
                      <article key={paper.id} className="border-b border-stone-200 pb-6 last:border-0">
                        <div className="text-[10px] font-mono tracking-wider uppercase text-blue-600 mb-1">{paper.category}</div>
                        <h3 className="font-serif font-bold text-sm text-stone-950 mb-1 hover:underline cursor-pointer leading-snug" onClick={() => onReadPaper(paper)}>
                          {paper.title}
                        </h3>
                        <p className="text-[10px] font-sans text-stone-500 italic mb-2">
                          Filed by {paper.authors.join(", ")} of {paper.schools[0]} ({paper.countries[0]})
                        </p>
                        <p className="text-xs text-stone-700 leading-relaxed font-sans line-clamp-2 mb-3">
                          {paper.abstract}
                        </p>
                        <button
                          onClick={() => onReadPaper(paper)}
                          className="text-[11px] text-blue-600 font-medium font-sans hover:text-blue-800 cursor-pointer flex items-center gap-1"
                        >
                          Read Editorial Section <Link className="w-3 h-3" />
                        </button>
                      </article>
                    ))}
                    {activeSitePapers.length === 0 && (
                      <div className="text-center py-8 text-xs italic text-stone-400">
                        No corresponding bulletin papers today.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Live API request Inspector */}
        <div className="bg-gradient-to-br from-[#090e1a]/40 via-[#040712]/35 to-[#090e1a]/30 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-2xl flex flex-col justify-between h-[510px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-mono text-stone-200 uppercase tracking-wider font-bold">Live API Request Monitor</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                HTTP 200 OK
              </span>
            </div>

            {/* Simulated Curl details */}
            <div className="space-y-3 font-mono text-[10px]">
              <div>
                <span className="text-stone-500"># Fetch URL</span>
                <p className="text-stone-300 break-all bg-[#020408] border border-slate-900 p-2 rounded mt-1">
                  GET {activeSite.domain === "quantumhorizon.edu" ? "/api/papers?category=Quantum%20Computing" : activeSite.domain === "vanguardlife.org" ? "/api/papers?category=Biotechnology" : "/api/papers"}
                </p>
              </div>

              <div>
                <span className="text-stone-500"># Response Performance</span>
                <p className="text-emerald-450 font-bold mt-1">
                  Returned {activeSitePapers.length} results in <span className="underline">{simulatedQueryTime}ms</span>
                </p>
              </div>

              <div>
                <span className="text-stone-500"># JSON Response Payload (Truncated)</span>
                <div className="bg-[#020408] border border-slate-900 p-3 rounded mt-1 overflow-y-auto h-[200px] text-stone-350 scrollbar-none select-all whitespace-pre-wrap leading-relaxed shadow-inner">
                  {JSON.stringify(
                    activeSitePapers.slice(0, 2).map((p) => ({
                      id: p.id,
                      title: p.title.substring(0, 40) + "...",
                      authors: p.authors,
                      origin: p.schools[0],
                      category: p.category,
                      isExternal: p.isExternal
                    })),
                    null,
                    2
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-4 text-stone-500 text-[10px] font-mono flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Secure TLS 1.3 encrypted handshakes. Access keys verified server-side.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
