/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  name: string;
  provider: "email" | "google" | "github";
  avatarUrl?: string;
  notes?: ResearchNote[];
}

export interface ResearchNote {
  id: string;
  paperId: string;
  paperTitle: string;
  category: string;
  noteText: string;
  updatedAt: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  schools: string[];
  countries: string[];
  abstract: string;
  category: string;
  pdfUrl: string;
  publishedDate: string;
  downloadCount: number;
  bookmarkCount: number;
  isExternal: boolean;
  externalSource?: string;
  summary?: string;
}

export interface Bookmark {
  paperId: string;
  bookmarkedAt: string;
}

export interface UploadedPaper {
  id: string;
  title: string;
  authors: string[];
  schools: string[];
  countries: string[];
  abstract: string;
  category: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
}

export interface SearchTopic {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface SyndicatedSite {
  id: string;
  name: string;
  domain: string;
  description: string;
  theme: "brutalist" | "science-lab" | "school-bulletin";
  accentColor: string;
}
