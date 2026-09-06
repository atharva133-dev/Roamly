import { Plane, Sparkles, MapPin } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAFBF8] select-none">
      <div className="relative w-full max-w-xl px-6 sm:px-8 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#485C11] to-[#6B7F3A] shadow-sm text-white">
            <Sparkles className="size-3.5" />
          </span>
          <span className="font-serif text-2xl font-bold tracking-tight text-[#1a1a1a]">
            Roamly
          </span>
        </div>

        {/* Horizontal Flight Track */}
        <div className="relative w-full py-6">
          <div className="w-full h-1 bg-[#e5e7db] rounded-full overflow-hidden relative">
            <div className="h-full w-2/3 bg-gradient-to-r from-[#8E9C78]/40 via-[#6B7F3A] to-[#485C11] rounded-full animate-pulse" />
          </div>
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 border-t border-dashed border-[#8E9C78]/50 pointer-events-none" />

          {/* Plane */}
          <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2">
            <div className="relative flex size-9 items-center justify-center rounded-full bg-[#485C11] text-white shadow-md shadow-[#485C11]/30">
              <Plane className="size-4.5 fill-white rotate-90" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="w-full flex items-center justify-between text-xs font-semibold text-[#6B7F3A] tracking-wider uppercase pt-1">
          <span className="flex items-center gap-1 text-[#1a1a1a]">
            <MapPin className="size-3 text-[#485C11]" />
            Your Location
          </span>
          <span className="flex items-center gap-1 text-[#485C11]">
            Dream Destination
            <Sparkles className="size-3" />
          </span>
        </div>

        <p className="mt-6 text-xs font-medium text-muted-foreground tracking-wide text-center">
          Loading travel intelligence...
        </p>
      </div>
    </div>
  );
}
