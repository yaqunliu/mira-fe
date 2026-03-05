"use client";

import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
  description: string;
  action: string;
}

interface ChatOptionsProps {
  options: Option[];
  message?: string;
  onSelect: (action: string) => void;
}

export function ChatOptions({ options, message, onSelect }: ChatOptionsProps) {
  return (
    <div className="space-y-3 my-2">
      {message && (
        <p className="text-sm text-gray-600">{message}</p>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.action)}
            className="w-full p-3 text-left rounded-xl border border-gray-200 hover:border-[#22C55E] hover:bg-[#22C55E]/5 transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{option.label.split(' ')[0]}</span>
              <div className="flex-1">
                <span className="font-medium text-gray-800 group-hover:text-[#22C55E]">
                  {option.label.split(' ').slice(1).join(' ')}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
