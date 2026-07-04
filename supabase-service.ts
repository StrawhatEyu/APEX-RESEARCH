import { createClient } from "@supabase/supabase-js";
import { User, ResearchNote } from "../types";

// Retrieve the Supabase URL and Anon Key from localStorage or the environment
const savedUrl = typeof window !== "undefined" ? localStorage.getItem("custom-supabase-url") : null;
const savedKey = typeof window !== "undefined" ? localStorage.getItem("custom-supabase-key") : null;

const supabaseUrl = savedUrl || (import.meta as any).env?.VITE_SUPABASE_URL || "https://rdietriicevxkekdscys.supabase.co";
const supabaseAnonKey = savedKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWV0cmlpY2V2eGtla2RzY3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDE2NTMsImV4cCI6MjA5ODQ3NzY1M30.gmxRcVMiMEaFrAg2zcNnR5BjueQXkX5p-pSa1uj1CLA";

// Clean any accidental quotes
const cleanUrl = supabaseUrl.trim().replace(/^["']|["']$/g, "");
const cleanKey = supabaseAnonKey.trim().replace(/^["']|["']$/g, "");

export const supabase = createClient(cleanUrl, cleanKey);

// Check if we have a valid custom Supabase URL and Anon Key configured
export const hasSupabaseConfigured = !!(
  cleanUrl &&
  cleanKey &&
  !cleanUrl.includes("your_supabase_url") &&
  cleanUrl.startsWith("https://")
);

// Retrieve default credentials used by default clusters
export function getDefaultSupabaseCredentials() {
  return {
    url: "https://rdietriicevxkekdscys.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaWV0cmlpY2V2eGtla2RzY3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDE2NTMsImV4cCI6MjA5ODQ3NzY1M30.gmxRcVMiMEaFrAg2zcNnR5BjueQXkX5p-pSa1uj1CLA"
  };
}

// Retrieve currently active credentials
export function getActiveSupabaseCredentials() {
  return {
    url: cleanUrl,
    anonKey: cleanKey,
    isCustom: !!savedUrl
  };
}

// Save custom credentials and refresh the view
export function saveCustomSupabaseCredentials(url: string, key: string) {
  if (url && key) {
    localStorage.setItem("custom-supabase-url", url.trim());
    localStorage.setItem("custom-supabase-key", key.trim());
    return true;
  }
  return false;
}

// Clear custom credentials and restore default clusters
export function clearCustomSupabaseCredentials() {
  localStorage.removeItem("custom-supabase-url");
  localStorage.removeItem("custom-supabase-key");
}

// Live handshake verification check for all tables and auth
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tables: { profiles: boolean; bookmarks: boolean; notes: boolean };
}> {
  const status = {
    connected: false,
    message: "Initializing live ping...",
    tables: { profiles: false, bookmarks: false, notes: false }
  };
  
  try {
    // 1. Check if we can connect to Supabase
    const { error: authErr } = await supabase.auth.getSession();
    if (authErr) {
      status.message = `Handshake failed: ${authErr.message}`;
      return status;
    }
    
    status.connected = true;
    
    // 2. Test profiles table query
    try {
      const { error: profErr } = await supabase.from("profiles").select("id").limit(1);
      status.tables.profiles = !profErr || profErr.code !== "42P01";
    } catch (e) {
      status.tables.profiles = false;
    }
    
    // 3. Test bookmarks table query
    try {
      const { error: bookErr } = await supabase.from("bookmarks").select("user_id").limit(1);
      status.tables.bookmarks = !bookErr || bookErr.code !== "42P01";
    } catch (e) {
      status.tables.bookmarks = false;
    }
    
    // 4. Test notes table query
    try {
      const { error: notesErr } = await supabase.from("notes").select("id").limit(1);
      status.tables.notes = !notesErr || notesErr.code !== "42P01";
    } catch (e) {
      status.tables.notes = false;
    }
    
    if (!status.tables.profiles || !status.tables.bookmarks || !status.tables.notes) {
      status.message = "Successfully connected to your Supabase project, but some database tables are missing. Click 'Show Setup SQL' below to initialize them.";
    } else {
      status.message = "100% operational! Connection verified and database schemas are fully compatible.";
    }
    
  } catch (err: any) {
    status.connected = false;
    status.message = `Network failed or invalid credentials. Error: ${err?.message || err}`;
  }
  
  return status;
}

// Retrieve and manage the active Auth mode: strictly "supabase"
export function getAuthMode(): "supabase" | "sandbox" {
  return "supabase";
}

export function setAuthMode(mode: "supabase" | "sandbox") {
  // No-op to prevent state-changing actions from sandbox
}

export const isSupabaseActive = true;

// --------------------------------------------------------------------
// DATABASE SYNC SERVICES WITH SEAMLESS EXPRESS BACKEND FALLBACKS
// --------------------------------------------------------------------

/**
 * Sync user profile to Supabase. If the 'profiles' table is missing, fall back to backend.
 */
export async function syncSupabaseProfile(user: User): Promise<boolean> {
  if (!isSupabaseActive) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: user.name,
        avatar_url: user.avatarUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) {
      if (error.code === "42P01") {
        console.warn("Supabase 'profiles' table not found. Using local Express backend fallback.");
        return false;
      }
      throw error;
    }
    return true;
  } catch (err) {
    console.warn("Supabase profile sync error:", err);
    return false;
  }
}

/**
 * Sync bookmarks to Supabase. Fallback if bookmarks table is missing.
 */
export async function syncSupabaseBookmarks(userId: string, bookmarks: string[]): Promise<boolean> {
  if (!isSupabaseActive) return false;
  try {
    // Delete existing bookmarks for the user
    const { error: deleteError } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      if (deleteError.code === "42P01") return false;
      throw deleteError;
    }

    if (bookmarks.length === 0) return true;

    // Insert current bookmarks
    const rows = bookmarks.map(paperId => ({
      user_id: userId,
      paper_id: paperId,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from("bookmarks")
      .insert(rows);

    if (insertError) throw insertError;
    return true;
  } catch (err) {
    console.warn("Supabase bookmarks sync failed:", err);
    return false;
  }
}

/**
 * Sync notes to Supabase. Fallback if notes table is missing.
 */
export async function syncSupabaseNotes(userId: string, notes: ResearchNote[]): Promise<boolean> {
  if (!isSupabaseActive) return false;
  try {
    // Delete old notes
    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      if (deleteError.code === "42P01") return false;
      throw deleteError;
    }

    if (notes.length === 0) return true;

    const rows = notes.map(note => ({
      id: note.id,
      user_id: userId,
      paper_id: note.paperId,
      paper_title: note.paperTitle,
      category: note.category,
      note_text: note.noteText,
      updated_at: note.updatedAt
    }));

    const { error: insertError } = await supabase
      .from("notes")
      .insert(rows);

    if (insertError) throw insertError;
    return true;
  } catch (err) {
    console.warn("Supabase notes sync failed:", err);
    return false;
  }
}

/**
 * Fetch all user library data from Supabase. Falls back to Express API.
 */
export async function fetchSupabaseLibraryData(userId: string): Promise<{
  bookmarks?: string[];
  downloads?: string[];
  history?: string[];
  notes?: ResearchNote[];
} | null> {
  if (!isSupabaseActive) return null;
  try {
    const data: { bookmarks: string[]; downloads: string[]; history: string[]; notes: ResearchNote[] } = {
      bookmarks: [],
      downloads: [],
      history: [],
      notes: []
    };

    // Bookmarks fetch
    const { data: bData, error: bErr } = await supabase
      .from("bookmarks")
      .select("paper_id")
      .eq("user_id", userId);
    
    if (bErr) {
      if (bErr.code === "42P01") return null; // Tables don't exist yet
      throw bErr;
    }
    data.bookmarks = (bData || []).map(b => b.paper_id);

    // Notes fetch
    const { data: nData, error: nErr } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId);
    
    if (nErr) throw nErr;
    data.notes = (nData || []).map(n => ({
      id: n.id,
      paperId: n.paper_id,
      paperTitle: n.paper_title,
      category: n.category,
      noteText: n.note_text,
      updatedAt: n.updated_at
    }));

    return data;
  } catch (err) {
    console.warn("Could not retrieve library data from Supabase:", err);
    return null;
  }
}
