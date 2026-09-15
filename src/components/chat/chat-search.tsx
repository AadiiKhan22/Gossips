"use client";

import { Search, X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ChatSearch({ value, onChange, className }: ChatSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        placeholder="Search chats..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-background/80 pl-9"
        aria-label="Search chats"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
