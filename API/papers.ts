import type { VercelRequest, VercelResponse } from '@vercel/node';

// Default inspiring research papers authored by high school students to pre-populate the DB
const DEFAULT_PAPERS = [
  {
    id: "hs-001",
    title: "Optimizing CRISPR-Cas9 Target Cleavage via Multi-Layer Recurrent Neural Networks",
    authors: ["Elias Vance", "Sophia Chen"],
    schools: ["Lakeside Science Academy", "Bay Area STEM Charter"],
    countries: ["United States", "United States"],
    abstract: "CRISPR-Cas9 has revolutionized genomic editing, yet off-target cleavages remain a primary safety concern for therapeutic applications. In this work, we present a novel recurrent neural network (RNN) architecture trained on high-throughput sequencing datasets to predict Cas9 cleavage efficiency and off-target probability. Our model achieves an AUC of 0.94, outperforming traditional thermodynamic-based predictions. We demonstrate how this tool can be used by high school biology labs to select guide RNAs (gRNAs) with zero off-target risks.",
    category: "Biotechnology & Genetics",
    pdfUrl: "https://arxiv.org/pdf/2012.00001",
    publishedDate: "2026-04-12",
    downloadCount: 142,
    bookmarkCount: 88,
    isExternal: false,
    externalSource: "Global Youth Journal"
  },
  {
    id: "hs-002",
    title: "A Low-Cost Solar-Powered Desalination Prototype Using Carbonized Banana Peels",
    authors: ["Amara Okafor", "Kenji Sato"],
    schools: ["Federal Government College, Enugu", "Tokyo Metropolitan High School"],
    countries: ["Nigeria", "Japan"],
    abstract: "Access to clean drinking water is an acute challenge in coastal developing regions. We developed a low-cost, decentralized solar distillation unit utilizing carbonized Musa acuminata (banana) peels as a photothermal membrane. The carbonization process was optimized at 400°C to maximize solar absorption. Our prototype produced 4.8 L/m²/day of distilled water under standard 1-sun illumination, reducing salinity from 35,000 ppm to less than 120 ppm, well within WHO safety guidelines. Total production cost per unit is under $12 USD.",
    category: "Environmental Engineering",
    pdfUrl: "https://arxiv.org/pdf/2103.00005",
    publishedDate: "2026-05-18",
    downloadCount: 310,
    bookmarkCount: 174,
    isExternal: false,
    externalSource: "International Youth Science Fair"
  },
  {
    id: "hs-003",
    title: "An Anomaly Detection Framework for High-Frequency Quantum Cryptography Logs",
    authors: ["Mateo Al-Jamil"],
    schools: ["Lycée International de Paris"],
    countries: ["France"],
    abstract: "Quantum Key Distribution (QKD) provides theoretically unbreakable security based on the laws of physics. However, physical QKD implementations are vulnerable to side-channel eavesdropping and decoy-state attacks. We present a real-time, lightweight machine learning model designed to analyze high-frequency avalanche photodiode logs for subtle timing signatures of eavesdropping. Our random-forest ensemble operates with 14ms latency, making it highly suitable for defense integration.",
    category: "Quantum Computing",
    pdfUrl: "https://arxiv.org/pdf/2205.00010",
    publishedDate: "2026-06-01",
    downloadCount: 95,
    bookmarkCount: 42,
    isExternal: false,
    externalSource: "Apex High Research Journal"
  },
  {
    id: "hs-004",
    title: "A Framework for Web Development Education: Empowering Ethiopian High School Students",
    authors: ["Eyuel Wondafrash", "Abebe Kebede"],
    schools: ["Bole High School, Addis Ababa", "Ethiopian Developer Academy"],
    countries: ["Ethiopia", "Ethiopia"],
    abstract: "With the rapid digitization of East Africa, training high schoolers in software engineering is vital for national economic improvement. We present an open-source, collaborative curriculum tailored specifically for Ethiopian High School web developer students. The curriculum focuses on modern TypeScript, full-stack React architectures, and API caching mechanisms. Our empirical results show a 40% improvement in independent project completion rates among Ethiopian youth, demonstrating that early-stage software incubation drives systemic academic and industrial improvement in developing economies.",
    category: "Computer Science & AI",
    pdfUrl: "https://arxiv.org/pdf/2012.00001",
    publishedDate: "2026-06-15",
    downloadCount: 215,
    bookmarkCount: 110,
    isExternal: false,
    externalSource: "Apex High Research Journal"
  },
  {
    id: "hs-005",
    title: "Machine Learning Approaches to Agricultural Yield Improvement in Ethiopian Highland Farming",
    authors: ["Eyuel Wondafrash", "Hana Selassie"],
    schools: ["Addis Ababa STEM Centre", "Ethiopian High School Web Developer Association"],
    countries: ["Ethiopia", "Ethiopia"],
    abstract: "Sustainable agricultural improvement is critical for food security in sub-Saharan Africa. This paper implements a localized random-forest regression model to optimize fertilizer allocation and crop rotation strategies for smallholder farmers in the Ethiopian highlands. By analyzing historical precipitation, soil pH, and nitrogen levels, our web-based modeling tool predicted grain yield with an R² of 0.89. The accompanying web application, developed by Ethiopian high school programmers, offers real-time SMS alerts to farmers, driving a 15% increase in seasonal crop output.",
    category: "Environmental Engineering",
    pdfUrl: "https://arxiv.org/pdf/2103.00005",
    publishedDate: "2026-06-20",
    downloadCount: 184,
    bookmarkCount: 92,
    isExternal: false,
    externalSource: "Apex High Research Journal"
  }
];

// Helper to map categories
function mapArxivCategory(cat: string): string {
  if (cat.startsWith("astro-ph")) return "Astrophysics & Cosmology";
  if (cat.startsWith("cond-mat")) return "Materials Science";
  if (cat.startsWith("cs")) return "Computer Science & AI";
  if (cat.startsWith("math")) return "Mathematics & Statistics";
  if (cat.startsWith("hep") || cat.startsWith("nucl") || cat.startsWith("physics")) return "Physics & Physical Sciences";
  if (cat.startsWith("q-bio")) return "Biology & Genetics";
  if (cat.startsWith("q-fin")) return "Quantitative Finance";
  if (cat.startsWith("stat")) return "Statistics";
  return "General STEM Research";
}

// Reconstruct OpenAlex Inverted Index Abstract
function reconstructAbstract(invertedIndex: any): string {
  if (!invertedIndex) return "No abstract available.";
  try {
    const words: string[] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      if (Array.isArray(positions)) {
        positions.forEach((pos: number) => {
          words[pos] = word;
        });
      }
    }
    return words.filter(Boolean).join(" ");
  } catch (e) {
    return "No abstract available.";
  }
}

// ---------------- EXTERNAL API SEARCH METHODS ----------------

async function fetchArxivPapers(query: string, maxResults = 8): Promise<any[]> {
  const formattedQuery = encodeURIComponent(query || "high school science");
  const url = `https://export.arxiv.org/api/query?search_query=all:${formattedQuery}&max_results=${maxResults}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error();
    const xml = await response.text();
    const entries: any[] = [];
    const entryBlocks = xml.split("<entry>");
    
    for (let i = 1; i < entryBlocks.length; i++) {
      const block = entryBlocks[i];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      let title = titleMatch ? titleMatch[1].trim() : "Unknown Paper";
      title = title.replace(/\s+/g, " ");
      
      const idMatch = block.match(/<id>([\s\S]*?)<\/id>/);
      const idUrl = idMatch ? idMatch[1].trim() : "";
      const arxivId = idUrl.split("/abs/").pop() || Math.random().toString(36).substring(7);
      
      const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/);
      let abstract = summaryMatch ? summaryMatch[1].trim() : "No abstract available.";
      abstract = abstract.replace(/\s+/g, " ");
      
      const authorMatches = [...block.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)];
      const authors = authorMatches.map(m => m[1].trim());
      
      const categoryMatch = block.match(/<category term="([^"]+)"/);
      const rawCategory = categoryMatch ? categoryMatch[1] : "General Science";
      const category = mapArxivCategory(rawCategory);
      
      const publishedMatch = block.match(/<published>([\s\S]*?)<\/published>/);
      const publishedDate = publishedMatch ? publishedMatch[1].trim().substring(0, 10) : new Date().toISOString().substring(0, 10);
      
      entries.push({
        id: `arxiv-${arxivId}`,
        title,
        authors: authors.length > 0 ? authors : ["Anonymous Researcher"],
        schools: authors.map((_, index) => index % 2 === 0 ? "International Science Academy" : "Global STEM High School"),
        countries: ["International Collaboration"],
        abstract,
        category,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        publishedDate,
        downloadCount: Math.floor(Math.random() * 80) + 10,
        bookmarkCount: Math.floor(Math.random() * 40) + 5,
        isExternal: true,
        externalSource: "arXiv Repository"
      });
    }
    return entries;
  } catch { return []; }
}

async function fetchOpenAlexPapers(query: string, maxResults = 8): Promise<any[]> {
  const formattedQuery = encodeURIComponent(query || "high school science");
  try {
    const response = await fetch(`https://api.openalex.org/works?search=${formattedQuery}&per_page=${maxResults}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "mailto:eyuelwondafrash014@gmail.com" }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const entries: any[] = [];
    
    if (data?.results) {
      data.results.forEach((work: any) => {
        const authors: string[] = [];
        const schools: string[] = [];
        const countries: string[] = [];
        if (Array.isArray(work.authorships)) {
          work.authorships.forEach((auth: any) => {
            if (auth.author?.display_name) authors.push(auth.author.display_name);
            if (Array.isArray(auth.institutions)) {
              auth.institutions.forEach((inst: any) => {
                if (inst.display_name) schools.push(inst.display_name);
                if (inst.country_code) countries.push(inst.country_code);
              });
            }
          });
        }
        const abstract = reconstructAbstract(work.abstract_inverted_index);
        entries.push({
          id: `openalex-${work.id.split("/").pop()}`,
          title: work.title || "Untitled Paper",
          authors: authors.length ? authors.slice(0, 4) : ["Academic Researcher"],
          schools: schools.length ? schools.slice(0, 2) : ["Global Research Institute"],
          countries: countries.length ? countries.slice(0, 2) : ["US"],
          abstract: abstract.length > 400 ? abstract.substring(0, 400) + "..." : abstract,
          category: work.concepts?.[0]?.display_name || "General STEM Research",
          pdfUrl: work.primary_location?.pdf_url || work.open_access?.oa_url || `https://arxiv.org/pdf/2103.00005`,
          publishedDate: work.publication_date || new Date().toISOString().substring(0, 10),
          downloadCount: Math.floor(Math.random() * 90) + 15,
          bookmarkCount: Math.floor(Math.random() * 50) + 8,
          isExternal: true,
          externalSource: "OpenAlex Index"
        });
      });
    }
    return entries;
  } catch { return []; }
}

async function fetchCrossrefPapers(query: string, maxResults = 8): Promise<any[]> {
  try {
    const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "mailto:eyuelwondafrash014@gmail.com" }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const entries: any[] = [];
    
    data?.message?.items?.forEach((item: any) => {
      const title = Array.isArray(item.title) ? item.title[0] : (item.title || "Untitled Paper");
      const authors = Array.isArray(item.author) ? item.author.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean) : [];
      const dateParts = item.created?.["date-parts"]?.[0] || [2025, 1, 1];
      entries.push({
        id: `crossref-${item.DOI || Math.random().toString(36).substring(7)}`,
        title,
        authors: authors.length ? authors.slice(0, 4) : ["Academic Author"],
        schools: [item["container-title"]?.[0] || item.publisher || "Research Repository"],
        countries: ["International"],
        abstract: item.abstract?.replace(/<[^>]*>/g, " ").trim() || "Full metadata available via DOI link.",
        category: "Crossref Indexed",
        pdfUrl: item.URL || `https://doi.org/${item.DOI}`,
        publishedDate: `${dateParts[0]}-${String(dateParts[1]).padStart(2, "0")}-${String(dateParts[2]).padStart(2, "0")}`,
        downloadCount: Math.floor(Math.random() * 70) + 12,
        bookmarkCount: Math.floor(Math.random() * 30) + 4,
        isExternal: true,
        externalSource: "Crossref Metadata"
      });
    });
    return entries;
  } catch { return []; }
}

async function fetchSemanticScholarPapers(query: string, maxResults = 8): Promise<any[]> {
  try {
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${maxResults}&fields=title,authors,abstract,year,venue,externalIds`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return [];
    const data = await response.json();
    const entries: any[] = [];
    
    data?.data?.forEach((item: any) => {
      const authors = Array.isArray(item.authors) ? item.authors.map((a: any) => a.name).filter(Boolean) : [];
      entries.push({
        id: `semanticscholar-${item.paperId || Math.random().toString(36).substring(7)}`,
        title: item.title || "Untitled Paper",
        authors: authors.length ? authors.slice(0, 4) : ["AI Scholar"],
        schools: [item.venue || "Semantic Scholar Index"],
        countries: ["International"],
        abstract: item.abstract || "Abstract details provided in Semantic Scholar database.",
        category: "Computer Science & AI",
        pdfUrl: item.externalIds?.ArXiv ? `https://arxiv.org/pdf/${item.externalIds.ArXiv}` : `https://www.semanticscholar.org/paper/${item.paperId}`,
        publishedDate: `${item.year || 2025}-01-01`,
        downloadCount: Math.floor(Math.random() * 120) + 25,
        bookmarkCount: Math.floor(Math.random() * 60) + 10,
        isExternal: true,
        externalSource: "Semantic Scholar"
      });
    });
    return entries;
  } catch { return []; }
}

async function fetchEuropePmcPapers(query: string, maxResults = 8): Promise<any[]> {
  try {
    const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${maxResults}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return [];
    const data = await response.json();
    const entries: any[] = [];
    
    data?.resultList?.result?.forEach((item: any) => {
      const authors = item.authorString ? item.authorString.split(",").map((s: string) => s.trim()) : ["Bio Researcher"];
      entries.push({
        id: `europepmc-${item.id || Math.random().toString(36).substring(7)}`,
        title: item.title || "Untitled Paper",
        authors: authors.slice(0, 4),
        schools: [item.journalTitle || "Europe PMC Indexed Journal"],
        countries: ["Europe/Global"],
        abstract: item.abstractText || "Europe PMC indexing detail.",
        category: "Medical & Life Sciences",
        pdfUrl: item.pmcid ? `https://europepmc.org/backend/pt/pdf-redirect/?articleId=${item.pmcid}&target=files` : `https://europepmc.org/article/MED/${item.id}`,
        publishedDate: `${item.pubYear || 2025}-01-01`,
        downloadCount: Math.floor(Math.random() * 85) + 15,
        bookmarkCount: Math.floor(Math.random() * 45) + 6,
        isExternal: true,
        externalSource: "Europe PMC"
      });
    });
    return entries;
  } catch { return []; }
}

async function fetchPlosPapers(query: string, maxResults = 8): Promise<any[]> {
  try {
    const response = await fetch(`https://api.plos.org/search?q=everything:${encodeURIComponent(query)}&rows=${maxResults}&wt=json`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return [];
    const data = await response.json();
    const entries: any[] = [];
    
    data?.response?.docs?.forEach((item: any) => {
      const authors = Array.isArray(item.author_display) ? item.author_display : ["PLOS Researcher"];
      entries.push({
        id: `plos-${item.id.replace("/", "_") || Math.random().toString(36).substring(7)}`,
        title: item.title_display || "Untitled Paper",
        authors: authors.slice(0, 4),
        schools: ["PLOS ONE Journal"],
        countries: ["United States"],
        abstract: Array.isArray(item.abstract) ? item.abstract[0] : "Open Access Public Library of Science article.",
        category: "Open Science Journal",
        pdfUrl: `https://journals.plos.org/plosone/article/file?id=${item.id}&type=printable`,
        publishedDate: item.publication_date ? item.publication_date.substring(0, 10) : "2025-01-01",
        downloadCount: Math.floor(Math.random() * 110) + 20,
        bookmarkCount: Math.floor(Math.random() * 55) + 12,
        isExternal: true,
        externalSource: "PLOS Open Access"
      });
    });
    return entries;
  } catch { return []; }
}

// Keyword Scoring Engine Logic
function searchAndScorePapers(papers: any[], searchQuery: string) {
  if (!searchQuery) return papers;
  const searchLower = searchQuery.toLowerCase().trim();
  const searchWords = searchLower.split(/[\s,.-]+/).filter(w => w.length >= 2);
  if (searchWords.length === 0) return papers;

  return papers.map((p: any) => {
    let score = 0;
    const titleLower = (p.title || "").toLowerCase();
    const abstractLower = (p.abstract || "").toLowerCase();
    const categoryLower = (p.category || "").toLowerCase();

    if (titleLower.includes(searchLower)) score += 150;
    else if (abstractLower.includes(searchLower)) score += 80;

    searchWords.forEach((word: string) => {
      if (titleLower.includes(word)) score += 30;
      if (abstractLower.includes(word)) score += 15;
      if (categoryLower.includes(word)) score += 10;
    });

    return { ...p, score };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);
}

// ---------------- MAIN VERCEL HANDLER ----------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Setup Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const search = (req.query.search as string) || "";
    const apiSource = (req.query.apiSource as string) || "all";

    let collectedPapers: any[] = [...DEFAULT_PAPERS];

    // Evaluate live APIs based on client choices
    if (search.trim().length > 0) {
      if (apiSource === "all" || apiSource === "arxiv") {
        const arxiv = await fetchArxivPapers(search);
        collectedPapers.push(...arxiv);
      }
      if (apiSource === "all" || apiSource === "openalex") {
        const openAlex = await fetchOpenAlexPapers(search);
        collectedPapers.push(...openAlex);
      }
      if (apiSource === "all" || apiSource === "crossref") {
        const crossref = await fetchCrossrefPapers(search);
        collectedPapers.push(...crossref);
      }
      if (apiSource === "all" || apiSource === "semanticscholar") {
        const semantic = await fetchSemanticScholarPapers(search);
        collectedPapers.push(...semantic);
      }
      if (apiSource === "all" || apiSource === "europepmc") {
        const europepmc = await fetchEuropePmcPapers(search);
        collectedPapers.push(...europepmc);
      }
      if (apiSource === "all" || apiSource === "plos") {
        const plos = await fetchPlosPapers(search);
        collectedPapers.push(...plos);
      }
    }

    // Process and sort accumulated database arrays using keyword scores
    const finalResults = searchAndScorePapers(collectedPapers, search);

    return res.status(200).json(finalResults);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Serverless Execution Failed' });
  }
}
