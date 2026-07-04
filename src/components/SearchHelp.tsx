/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SEARCH_TOPICS, RESEARCH_CATEGORIES } from "../data";
import { SearchTopic } from "../types";
import { BookOpen, Sparkles, HelpCircle, GraduationCap, X, ChevronRight, Hash } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SearchHelpProps {
  onSelectTopic: (topicName: string) => void;
  activeSearchQuery: string;
}

export default function SearchHelp({ onSelectTopic, activeSearchQuery }: SearchHelpProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Filter topics based on active search text or selected category
  const filteredTopics = SEARCH_TOPICS.filter((topic) => {
    const matchesCategory = !selectedCategory || topic.category === selectedCategory;
    const matchesSearch = !activeSearchQuery || 
      topic.name.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
      topic.keywords.some(k => k.toLowerCase().includes(activeSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-950/40 text-green-400 border-green-800/30";
      case "Intermediate":
        return "bg-blue-950/40 text-blue-400 border-blue-800/30";
      case "Advanced":
        return "bg-rose-950/40 text-rose-400 border-rose-800/30";
      default:
        return "bg-stone-900 text-stone-300 border-stone-800";
    }
  };

  return (
    <div className="w-full vibrant-glass border border-white/20 rounded-3xl p-6 shadow-xl mb-8" id="search-help-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 border border-white/10 rounded-xl text-cyan-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-100 text-base flex items-center gap-2">
              Topic Explorer & Research Taxonomy
              <span className="text-xs bg-slate-950/40 text-stone-200 px-2 py-0.5 rounded-full font-sans font-normal border border-white/10">
                {SEARCH_TOPICS.length} Disciplines
              </span>
            </h3>
            <p className="text-stone-300 text-xs mt-0.5">Need help finding a research area? Use our student-friendly curriculum map.</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-stone-100 hover:text-cyan-300 text-xs font-bold flex items-center gap-1.5 px-3.5 py-2 bg-white/10 border border-white/10 rounded-xl shadow-sm transition-all duration-300 hover:border-cyan-400/50 cursor-pointer shrink-0"
        >
          {isOpen ? "Collapse Guide" : "Explore Curriculum Map"}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Categories Fast Filter Row */}
      <div className="flex flex-wrap gap-1.5 mb-4 border-t border-white/10 pt-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
            !selectedCategory 
              ? "bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-[1.02]" 
              : "bg-white/5 text-stone-200 hover:text-cyan-300 hover:bg-white/10 border border-white/10"
          }`}
        >
          All Subjects
        </button>
        {RESEARCH_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
              selectedCategory === cat
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-[1.02]"
                : "bg-white/5 text-stone-200 hover:text-cyan-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {(isOpen || activeSearchQuery) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3" id="topic-grid">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    layoutId={topic.id}
                    onClick={() => onSelectTopic(topic.name)}
                    className="group vibrant-glass-bright border border-white/15 rounded-xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transform hover:scale-[1.01]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-display font-bold text-stone-100 group-hover:text-cyan-300 transition-colors text-sm">
                          {topic.name}
                        </h4>
                        <div className="flex gap-1.5 items-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getDifficultyColor(topic.difficulty)}`}>
                            {topic.difficulty}
                          </span>
                          <span className="text-[10px] bg-slate-950/40 text-stone-200 px-2 py-0.5 rounded-full font-mono border border-white/10">
                            {topic.category.split(" ")[0]}
                          </span>
                        </div>
                      </div>
                      <p className="text-stone-300 text-xs leading-relaxed mb-3">
                        {topic.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 items-center mt-auto border-t border-white/10 pt-2.5">
                      <span className="text-[10px] text-stone-400 font-mono mr-1">Search terms:</span>
                      {topic.keywords.slice(0, 4).map((key) => (
                        <span key={key} className="text-[10px] bg-white/5 text-stone-200 px-1.5 py-0.5 rounded-md font-mono flex items-center gap-0.5 border border-white/10">
                          <Hash className="w-2 h-2 text-cyan-400" />
                          {key}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-stone-400 text-xs">
                  No explicit curriculums found for this filter. Try clearing your search parameters.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
