"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Folder, Video as VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchResult {
  videos: Array<{
    id: string;
    name: string | null;
    description: string | null;
    thumbnail_url: string | null;
    folder: { id: string; name: string } | null;
  }>;
  folders: Array<{
    id: string;
    name: string;
    videoCount: number;
    folderCount: number;
  }>;
}

export function SearchInput() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    videos: [],
    folders: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ videos: [], folders: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults({ videos: [], folders: [] });
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults({ videos: [], folders: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleSelect = (type: "video" | "folder", id: string) => {
    setOpen(false);
    setQuery("");
    if (type === "video") {
      router.push(`/videos/${id}`);
    } else {
      router.push(`/library?folderId=${id}`);
    }
  };

  const hasResults = results.videos.length > 0 || results.folders.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-80">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search videos, folders, or content..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open && e.target.value) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              if (query) {
                setOpen(true);
              }
            }}
            className="w-full pl-10 pr-4 h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : !hasResults && debouncedQuery ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : !debouncedQuery ? (
              <CommandEmpty>Start typing to search...</CommandEmpty>
            ) : (
              <>
                {results.videos.length > 0 && (
                  <CommandGroup heading="Videos">
                    {results.videos.map((video) => (
                      <CommandItem
                        key={video.id}
                        value={`video-${video.id}`}
                        onSelect={() => handleSelect("video", video.id)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <VideoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {video.name || "Untitled Video"}
                          </div>
                          {video.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {video.description}
                            </div>
                          )}
                          {video.folder && (
                            <div className="text-xs text-muted-foreground">
                              {video.folder.name}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {results.folders.length > 0 && (
                  <CommandGroup heading="Folders">
                    {results.folders.map((folder) => (
                      <CommandItem
                        key={folder.id}
                        value={`folder-${folder.id}`}
                        onSelect={() => handleSelect("folder", folder.id)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{folder.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {folder.videoCount} videos, {folder.folderCount} folders
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
