"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";

export default function FeedSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    async function searchAnalysts() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase!
          .from("profiles")
          .select("id, username, avatar_url, role")
          .eq("role", "analyst")
          .ilike("username", `%${debouncedQuery}%`)
          .limit(5);

        if (error) throw error;
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }
    searchAnalysts();
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-[240px] sm:max-w-xs" ref={containerRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search Analysts..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) setIsOpen(false);
          }}
          onFocus={() => {
             if (results.length > 0) setIsOpen(true);
          }}
          className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-full text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
        {isSearching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          {results.length === 0 && !isSearching ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No analysts found matching &quot;{query}&quot;
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto py-1">
              {results.map((analyst) => (
                <Link
                  key={analyst.id}
                  href={`/analyst/${analyst.username}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-border/50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center overflow-hidden border border-secondary/20 flex-shrink-0">
                    {analyst.avatar_url ? (
                      <img src={analyst.avatar_url} alt={analyst.username} className="w-full h-full object-cover" />
                    ) : (
                      <User size={14} className="text-secondary" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-foreground truncate">{analyst.username}</p>
                    <p className="text-[10px] text-primary uppercase tracking-widest">Analyst</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
