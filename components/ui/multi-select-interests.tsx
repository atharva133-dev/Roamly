"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Plus, Search } from "lucide-react";
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
        className={`min-h-[46px] w-full rounded-xl border bg-white px-3.5 py-2 text-sm shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
          isOpen
            ? "border-[#485C11] ring-2 ring-[#485C11]/20"
            : "border-[#e5e7db] hover:border-[#8E9C78]"
        }`}
      >
        {/* Selected Badges or Placeholder */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-1">
          {selected.length === 0 ? (
            <span className="text-gray-400 select-none text-xs sm:text-sm">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="bg-[#DFECC6]/70 text-[#2f3d0c] border border-[#8E9C78]/40 hover:bg-[#DFECC6] px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 rounded-full shadow-2xs transition-colors"
              >
                <span>{item}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeOption(e, item)}
                  className="rounded-full hover:bg-black/10 p-0.5 transition-colors cursor-pointer"
                  title={`Remove ${item}`}
                >
                  <X className="size-3 text-[#2f3d0c]" />
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
              className="p-1 text-xs text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear all selected"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronDown
            className={`size-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#485C11]" : ""
            }`}
          />
        </div>
      </div>

      {/* Floating Multi-select Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-[#d2d7c5] bg-white shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search bar & quick actions header */}
          <div className="border-b border-[#e5e7db] p-3 bg-[#FAFBF8] space-y-2.5">
            <div className="relative flex items-center">
              <Search className="absolute left-3 size-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search interests (e.g. Food, Adventure)..."
                className="w-full h-8.5 pl-8.5 pr-8 text-xs bg-white rounded-lg border border-[#d2d7c5] focus:outline-none focus:border-[#485C11] focus:ring-1 focus:ring-[#485C11]"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center justify-between px-0.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">
                {selected.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[#485C11] hover:underline font-bold text-[11px] cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => handleClearAll()}
                  className="text-gray-500 hover:text-red-600 hover:underline text-[11px] cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Options Grid / List */}
          <div className="max-h-56 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-gray-400">
                No matching travel interests found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer select-none transition-all ${
                      isSelected
                        ? "bg-[#DFECC6]/50 text-[#293707] font-semibold border border-[#8E9C78]/40"
                        : "hover:bg-[#FAFBF8] text-gray-700 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#485C11] border-[#485C11] text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="size-3 stroke-[2.5]" />}
                      </div>
                      <span className="truncate">{opt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Custom Interest Input Row */}
          <form
            onSubmit={handleAddCustom}
            className="border-t border-[#e5e7db] px-3 py-2 bg-[#FAFBF8] flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add other interest (e.g. Scuba Diving)"
              className="flex-1 h-7.5 px-2.5 text-xs bg-white rounded-lg border border-[#d2d7c5] focus:outline-none focus:border-[#485C11]"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="h-7.5 px-3 rounded-lg bg-[#485C11] hover:bg-[#38480e] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="size-3" />
              Add
            </button>
          </form>

          {/* Prominent Footer with Done Button */}
          <div className="border-t border-[#d2d7c5] p-3 bg-white flex items-center justify-between gap-3 shadow-inner">
            <span className="text-xs text-gray-500 font-medium">
              {selected.length === 0 ? "None selected" : `${selected.length} interest${selected.length > 1 ? "s" : ""} selected`}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="px-5 py-1.5 rounded-xl bg-[#485C11] hover:bg-[#38480e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Check className="size-3.5 stroke-[2.5]" />
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
