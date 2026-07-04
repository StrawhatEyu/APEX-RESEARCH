/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchTopic, SyndicatedSite } from "./types";

export const RESEARCH_CATEGORIES = [
  "Biotechnology & Genetics",
  "Environmental Engineering",
  "Quantum Computing",
  "Artificial Intelligence & ML",
  "Astrophysics & Cosmology",
  "Social Sciences & Policy"
];

export const SEARCH_TOPICS: SearchTopic[] = [
  {
    id: "tp-001",
    name: "CRISPR-Cas9",
    description: "A precision gene-editing tool that acts like 'search-and-replace' for DNA sequences.",
    category: "Biotechnology & Genetics",
    keywords: ["crispr", "cas9", "gene editing", "cleavage", "grna", "genetics", "dna"],
    difficulty: "Advanced"
  },
  {
    id: "tp-002",
    name: "Solar Desalination",
    description: "Converting saltwater to drinking water using sunlight and heat-absorbing photothermal materials.",
    category: "Environmental Engineering",
    keywords: ["solar", "desalination", "water", "filter", "distillation", "clean water"],
    difficulty: "Beginner"
  },
  {
    id: "tp-003",
    name: "Quantum Key Distribution (QKD)",
    description: "Unbreakable security algorithms utilizing the principles of quantum mechanics to secure communications.",
    category: "Quantum Computing",
    keywords: ["quantum", "qkd", "cryptography", "security", "encryption", "photon"],
    difficulty: "Advanced"
  },
  {
    id: "tp-004",
    name: "Recurrent Neural Networks (RNN)",
    description: "Artificial intelligence architectures designed for sequential data processing, like timing or language.",
    category: "Artificial Intelligence & ML",
    keywords: ["rnn", "neural network", "deep learning", "ai", "machine learning", "prediction"],
    difficulty: "Intermediate"
  },
  {
    id: "tp-005",
    name: "Dark Matter & Galaxies",
    description: "Unseen matter in the universe that exerts gravitational force, studied through stellar rotation curves.",
    category: "Astrophysics & Cosmology",
    keywords: ["dark matter", "galaxy", "cosmology", "astrophysics", "stellar", "universe"],
    difficulty: "Intermediate"
  },
  {
    id: "tp-006",
    name: "Microplastic Bio-filtration",
    description: "Using natural organisms or carbon-based structures to extract microscopically small plastics from water.",
    category: "Environmental Engineering",
    keywords: ["microplastic", "pollution", "biofilter", "ocean", "ecology", "environment"],
    difficulty: "Intermediate"
  },
  {
    id: "tp-007",
    name: "Generative Adversarial Networks (GAN)",
    description: "An AI system where two neural networks compete (generator vs discriminator) to create hyper-realistic data.",
    category: "Artificial Intelligence & ML",
    keywords: ["gan", "generative ai", "image generation", "synthetic data", "machine learning"],
    difficulty: "Advanced"
  },
  {
    id: "tp-008",
    name: "Educational Equity Metrics",
    description: "Measuring resources, test performance, and access differences between urban and regional schools to guide policy.",
    category: "Social Sciences & Policy",
    keywords: ["education", "equity", "social policy", "demographics", "statistics"],
    difficulty: "Beginner"
  }
];

export const SYNDICATED_SITES: SyndicatedSite[] = [
  {
    id: "site-quantum",
    name: "Quantum Horizon Journal",
    domain: "quantumhorizon.edu",
    description: "A specialized brutalist science blog curated by the European Student Physics Syndicate, focusing on quantum mechanics and astrophysics.",
    theme: "brutalist",
    accentColor: "#f97316" // Orange
  },
  {
    id: "site-biotech",
    name: "Vanguard Life Sciences",
    domain: "vanguardlife.org",
    description: "A sleek, laboratory-themed portal operated by the Global High School Bio-Alliance, pulling live papers in CRISPR and medicine.",
    theme: "science-lab",
    accentColor: "#10b981" // Emerald
  },
  {
    id: "site-stem",
    name: "Apex STEM Bulletin",
    domain: "apexbulletin.com",
    description: "An elegant, newspaper-grid school board showcasing diverse student achievements in technology, engineering, and policy.",
    theme: "school-bulletin",
    accentColor: "#2563eb" // Blue
  }
];
