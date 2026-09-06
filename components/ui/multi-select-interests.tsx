"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Plus, Sparkles, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const DEFAULT_TRAVEL_INTERESTS = [
  "Cultural & Heritage",
  "Historical Sites",
  "Food & Culinary",
  "Adventure & Trekking",
  "Nature & Wildlife",
  "Beach & Coastal",
  "Relaxation & Wellness",
  "Photography & Scenic",
  "Urban & City Exploration",
  "Nightlife & Events",
  "Shopping & Local Markets",
  "Architecture & Art",
  "Road Trips & Scenic Drives",
  "Rural & Eco-Tourism",
];

interface MultiSelectInterestsProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  options?: string[];
  placeholder?: string;
}

export function MultiSelectInterests({
  selected,
  onChange,
  options = DEFAULT_TRAVEL_INTERESTS,
  placeholder = "Select your travel interests & styles...",
}: MultiSelectInterestsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const removeOption = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== opt));
  };

  const handleSelectAll = () => {
    onChange(Array.from(new Set([...selected, ...options])));
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomInput("");
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Dropdown Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[46px] w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-all cursor-pointer flex items-center justify-between gap-2 ${
          isOpen
            ? "border-[#485C11] ring-2 ring-[#485C11]/20"
            : "border-input hover:border-[#8E9C78]"
        }`}
      >
        {/* Selected Badges or Placeholder */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-1">
          {selected.length === 0 ? (
            <span className="text-muted-foreground select-none">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="bg-[#DFECC6]/70 text-[#364A0E] border border-[#8E9C78]/40 hover:bg-[#DFECC6] px-2 py-0.5 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <span>{item}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeOption(e, item)}
                  className="rounded-full hover:bg-[#364A0E]/10 p-0.5 transition-colors cursor-pointer"
                >
                  <X className="size-3 text-[#364A0E]" />
                </span>
              </Badge>
            ))
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 text-xs hover:text-foreground rounded-full hover:bg-muted transition-colors"
              title="Clear all"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#485C11]" : ""
            }`}
          />
        </div>
      </div>

      {/* Floating Multi-select Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 rounded-xl border border-[#e5e7db] bg-white shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search bar & quick actions */}
          <div className="border-b border-[#e5e7db] p-2 bg-[#FAFBF8] space-y-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search interests..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-white rounded-md border border-[#e5e7db] focus:outline-none focus:border-[#485C11]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground">
              <span>{selected.length} selected</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[#485C11] hover:underline font-semibold"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleClearAll()}
                  className="hover:underline text-destructive"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No matching interests found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer select-none transition-colors ${
                      isSelected
                        ? "bg-[#DFECC6]/40 text-[#364A0E] font-semibold"
                        : "hover:bg-muted text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#485C11] border-[#485C11] text-white"
                            : "border-[#8E9C78]/50 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="size-3 stroke-[2.5]" />}
                      </div>
                      <span>{opt}</span>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] text-[#485C11] font-mono">Selected</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Custom Interest Input */}
          <form
            onSubmit={handleAddCustom}
            className="border-t border-[#e5e7db] p-2 bg-[#FAFBF8] flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add custom interest (e.g., Scuba Diving)"
              className="flex-1 h-7 px-2 text-xs bg-white rounded border border-[#e5e7db] focus:outline-none focus:border-[#485C11]"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="h-7 px-2.5 rounded bg-[#485C11] hover:bg-[#3a4d0d] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="size-3" />
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
