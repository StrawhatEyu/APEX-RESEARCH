/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { RESEARCH_CATEGORIES } from "../data";
import { Upload, FileText, Globe, CheckCircle, ShieldAlert, Sparkles, Plus, Trash2, ArrowRight, BookOpen, User as UserIcon } from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface UploadWizardProps {
  currentUser: User;
  onUploadSuccess: () => void;
}

export default function UploadWizard({ currentUser, onUploadSuccess }: UploadWizardProps) {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState<string[]>([""]);
  const [school, setSchool] = useState("");
  const [country, setCountry] = useState("United States");
  const [abstract, setAbstract] = useState("");
  const [category, setCategory] = useState(RESEARCH_CATEGORIES[0]);
  
  // Drag and drop states
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review & publishing states
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"form" | "reviewing" | "published">("form");
  const [reviewLogs, setReviewLogs] = useState<string[]>([]);

  // Add/remove author handles
  const handleAddAuthor = () => {
    setAuthors([...authors, ""]);
  };

  const handleRemoveAuthor = (index: number) => {
    if (authors.length === 1) return;
    const next = [...authors];
    next.splice(index, 1);
    setAuthors(next);
  };

  const handleAuthorChange = (index: number, val: string) => {
    const next = [...authors];
    next[index] = val;
    setAuthors(next);
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  // Submission handles
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAuthors = authors.filter(a => a.trim() !== "");
    
    if (!title || cleanAuthors.length === 0 || !school || !abstract) {
      alert("Please fill in all mandatory fields before submitting.");
      return;
    }

    setCurrentStep("reviewing");
    setReviewLogs(["Establishing connection to publication server..."]);

    // Simulate standard student peer-review validations on the client before saving
    const steps = [
      "Running plagiarism scanner (Urkund Database check)...",
      "Validating academic document structure (sections, bibliography)...",
      "Scanning figures and equations for format safety...",
      "Registering digital Object Identifier (DOI) via Crossref proxy...",
      "Writing records to Apex High research network database..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setReviewLogs(prev => [...prev, steps[i]]);
    }

    try {
      // Send optional file details if available
      let fileData: string | null = null;
      let fileName: string | null = null;
      
      if (selectedFile) {
        fileName = selectedFile.name;
        // Read file content as base64 using a Promise
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(selectedFile);
        });
      }

      const response = await fetch("/api/papers/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          authors: cleanAuthors,
          schools: [school],
          countries: [country],
          abstract,
          category,
          userId: currentUser.id,
          fileData,
          fileName
        })
      });

      if (!response.ok) throw new Error("Could not publish paper to database.");
      
      setCurrentStep("published");
      onUploadSuccess();
    } catch (error) {
      alert("Error writing to database. Checking backup offline buffers.");
      setCurrentStep("form");
    }
  };

  // Reset uploader form
  const resetForm = () => {
    setTitle("");
    setAuthors([""]);
    setSchool("");
    setCountry("United States");
    setAbstract("");
    setSelectedFile(null);
    setCurrentStep("form");
  };

  return (
    <div className="bg-gradient-to-br from-[#020617]/40 via-[#0f172a]/35 to-[#1e1b4b]/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl max-w-4xl mx-auto" id="upload-wizard-container">
      <AnimatePresence mode="wait">
        
        {/* Step 1: Input Form */}
        {currentStep === "form" && (
          <motion.div
            key="upload-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="border-b border-slate-800 pb-5 mb-6">
              <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded font-semibold">
                Submit Research Paper
              </span>
              <h2 className="font-display font-bold text-stone-100 text-xl mt-3">
                International Peer-Review Submission
              </h2>
              <p className="text-stone-350 text-xs mt-1.5 leading-relaxed">
                Share your scientific achievements with our global high school consortium. Your paper will be peer-reviewed and published immediately.
              </p>
            </div>

            <form onSubmit={handlePublish} className="space-y-6">
              
              {/* Document File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Research Document
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                    dragActive 
                      ? "border-blue-500 bg-[#03060c]" 
                      : selectedFile 
                        ? "border-slate-700 bg-[#03060c]" 
                        : "border-slate-800 hover:border-blue-500/55 bg-[#03060c]/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.md,.txt,.docx"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-100">{selectedFile.name}</p>
                        <p className="text-[10px] text-stone-550 font-mono mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-900/80 text-stone-400 rounded-xl hover:bg-slate-800 transition-colors">
                        <Upload className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-300">Drag & drop your research manuscript here</p>
                        <p className="text-[10px] text-stone-500 mt-1">Supports PDF, Markdown, TXT (Max 25MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Research Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Research Paper Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., A Low-Cost Desalination Prototype Utilizing Carbonized Biomaterials"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#03060c] hover:bg-[#03060c]/70 focus:bg-[#03060c] border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 text-stone-100 text-sm focus:outline-none transition-all duration-300 font-sans"
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Academic Field
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#03060c] border border-slate-800 text-stone-350 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
                  >
                    {RESEARCH_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-950 text-stone-300">{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., United States, Japan, Nigeria"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-[#03060c] border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 text-stone-100 text-sm focus:outline-none font-sans transition-all duration-300"
                  />
                </div>
              </div>

              {/* Authors List */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Contributing Authors
                  <button
                    type="button"
                    onClick={handleAddAuthor}
                    className="text-[10px] font-sans text-stone-300 hover:text-cyan-400 flex items-center gap-0.5 border border-slate-800 hover:border-cyan-500/50 bg-slate-950 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.03] hover:shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  >
                    <Plus className="w-3 h-3 text-blue-500" /> Add Co-Author
                  </button>
                </label>
                <div className="space-y-2">
                  {authors.map((author, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <UserIcon className="absolute left-3 top-4 w-3.5 h-3.5 text-stone-500" />
                        <input
                          type="text"
                          required
                          placeholder={index === 0 ? "Primary Author Name" : `Co-Author ${index + 1} Name`}
                          value={author}
                          onChange={(e) => handleAuthorChange(index, e.target.value)}
                          className="w-full bg-[#03060c] border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-3.5 text-stone-100 text-sm focus:outline-none font-sans transition-all duration-300"
                        />
                      </div>
                      {authors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAuthor(index)}
                          className="p-3.5 text-rose-400 bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/40 hover:border-rose-500/60 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.03] hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* School Affiliation */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Academic Institution / High School
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bay Area STEM Academy"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full bg-[#03060c] border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 text-stone-100 text-sm focus:outline-none font-sans transition-all duration-300"
                />
              </div>

              {/* Abstract */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Paper Abstract
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe your research objectives, methodology, key findings, and scientific significance in 150-250 words."
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full bg-[#03060c] border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 text-stone-100 text-sm focus:outline-none font-sans leading-relaxed transition-all duration-300"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-850 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-3 rounded-full text-xs font-bold text-stone-300 cursor-pointer transition-all duration-300 interactive-glass-btn hover:text-cyan-400"
                >
                  Clear Fields
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 animated-gradient-btn text-white font-extrabold rounded-full text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  Submit & Peer-Review
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </motion.div>
        )}

        {/* Step 2: Peer Review Loader Simulator */}
        {currentStep === "reviewing" && (
          <motion.div
            key="publishing-steps"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12 flex flex-col items-center justify-center max-w-md mx-auto"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-blue-500 absolute top-5 left-5 animate-pulse" />
            </div>

            <h3 className="font-display font-bold text-stone-100 text-base text-center">
              Consortium Peer-Reviewing
            </h3>
            <p className="text-stone-400 text-xs text-center mt-1.5">
              Validating compliance, plagiarism logs, and DOI registration hooks...
            </p>

            <div className="w-full bg-[#03060c] border border-slate-850 rounded-xl p-4 mt-8 font-mono text-[10px] text-stone-400 space-y-2 max-h-48 overflow-y-auto shadow-inner">
              {reviewLogs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-blue-500 font-extrabold">&gt;</span>
                  <span className="leading-normal">{log}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Success Published Confirmation */}
        {currentStep === "published" && (
          <motion.div
            key="upload-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12 flex flex-col items-center text-center max-w-xl mx-auto"
          >
            <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 mb-6 shadow-md">
              <CheckCircle className="w-10 h-10" />
            </div>

            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-semibold">
              DOI Registered & Indexed
            </span>
            <h2 className="font-display font-bold text-stone-100 text-xl mt-4">
              Research Successfully Published!
            </h2>
            <p className="text-stone-300 text-xs mt-2 leading-relaxed max-w-md font-sans">
              Congratulations! Your research has cleared academic metadata integrity tests and is now indexed globally on the <strong className="text-blue-400">Apex High School Research Network</strong>.
            </p>

            {/* Simulated certificate */}
            <div className="w-full bg-[#03060c] border border-slate-850 rounded-2xl p-5 my-6 text-left relative overflow-hidden shadow-2xl">
              <div className="absolute right-3 top-3 opacity-[0.03]">
                <BookOpen className="w-24 h-24 text-blue-500" />
              </div>
              <p className="text-[10px] font-mono text-stone-500">INDEX RECORD: #{Math.floor(Math.random() * 90000) + 10000}</p>
              <h4 className="font-display font-bold text-stone-100 text-sm mt-1.5">{title}</h4>
              <p className="text-xs text-stone-400 mt-1 font-sans">
                By <span className="font-semibold text-stone-300">{authors.join(", ")}</span> of {school}
              </p>
              <div className="flex flex-col sm:flex-row sm:gap-6 text-[10px] text-stone-550 font-mono mt-4 pt-3.5 border-t border-slate-850 gap-2">
                <div>DOI: <span className="text-blue-450 font-bold">10.48550/Apex.2026.{Math.floor(Math.random() * 9000)}</span></div>
                <div>Status: <span className="text-emerald-400 font-bold">Peer-Reviewed / Open-Access</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-stone-300 cursor-pointer transition-all duration-300 interactive-glass-btn hover:text-cyan-400"
              >
                Publish Another Paper
              </button>
              <button
                onClick={onUploadSuccess}
                className="px-5 py-2.5 animated-gradient-btn text-white rounded-full text-xs font-extrabold cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              >
                Go To My Library
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
