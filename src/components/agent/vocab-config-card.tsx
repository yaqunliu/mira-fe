"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Send, BookOpen } from "lucide-react";

interface VocabConfigCardProps {
  onSubmit: (config: {
    words: string[];
    difficulty: "easy" | "medium" | "hard";
    repetitions: number;
  }) => void;
}

export function VocabConfigCard({ onSubmit }: VocabConfigCardProps) {
  const t = useTranslations("createAgent");
  const [words, setWords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [repetitions, setRepetitions] = useState(2);

  const addWord = () => {
    const word = inputValue.trim().toLowerCase();
    if (word && !words.includes(word)) {
      setWords([...words, word]);
      setInputValue("");
    }
  };

  const removeWord = (wordToRemove: string) => {
    setWords(words.filter((w) => w !== wordToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addWord();
    }
  };

  const handleSubmit = () => {
    if (words.length === 0) return;
    onSubmit({
      words,
      difficulty,
      repetitions,
    });
  };

  const difficultyLabels: Record<"easy" | "medium" | "hard", string> = {
    easy: t("vocabConfig.difficulty.easy"),
    medium: t("vocabConfig.difficulty.medium"),
    hard: t("vocabConfig.difficulty.hard"),
  };

  return (
    <div className="bg-white rounded-xl shadow-[4px_4px_16px_rgba(0,0,0,0.1),-4px_-4px_16px_rgba(255,255,255,0.95)] p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{t("vocabConfig.title")}</h3>
          <p className="text-sm text-gray-500">{t("vocabConfig.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-gray-700 flex items-center gap-2">
          <span>{t("vocabConfig.addWord")}</span>
          <span className="text-xs text-gray-400 font-normal">{t("vocabConfig.pressEnter")}</span>
        </Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("vocabConfig.wordPlaceholder")}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addWord}
            disabled={!inputValue.trim()}
            variant="outline"
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {words.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {words.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#22C55E]/10 text-[#22C55E] rounded-full text-sm"
              >
                {word}
                <button
                  onClick={() => removeWord(word)}
                  className="hover:bg-[#22C55E]/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-gray-700">{t("vocabConfig.difficultyLevel")}</Label>
        <div className="grid grid-cols-3 gap-3">
          {(["easy", "medium", "hard"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                difficulty === level
                  ? "border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]"
                  : "border-gray-200 hover:border-[#22C55E]/50 text-gray-600"
              }`}
            >
              {difficultyLabels[level]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-gray-700">{t("vocabConfig.repetitions")}</Label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={5}
            value={repetitions}
            onChange={(e) => setRepetitions(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#22C55E]"
          />
          <span className="w-8 text-center font-medium text-gray-700">
            {repetitions}
          </span>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={words.length === 0}
        className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] hover:from-[#16A34A] hover:to-[#87CEEB] text-white font-medium rounded-xl"
      >
        <Send className="w-4 h-4 mr-2" />
        {t("vocabConfig.startCreate")}
      </Button>
    </div>
  );
}
