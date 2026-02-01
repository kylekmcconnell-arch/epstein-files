"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  size?: "default" | "large";
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Search documents...",
  className = "",
  size = "default",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={size === "large" ? "h-12 text-base px-4" : ""}
      />
      <Button 
        type="submit" 
        size={size === "large" ? "lg" : "default"}
      >
        Search
      </Button>
    </form>
  );
}
