"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Sparkles, BookOpen, Volume2, Repeat } from "lucide-react";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "tags";
  placeholder?: string;
  required?: boolean;
  default?: any;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
}

interface ConfigCardProps {
  title: string;
  description?: string;
  fields: Field[];
  submitText: string;
  onSubmit: (values: Record<string, any>) => void;
}

export function ConfigCard({ title, description, fields, submitText, onSubmit }: ConfigCardProps) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      initial[field.name] = field.default ?? (field.type === "tags" ? [] : "");
    });
    return initial;
  });

  const [tagInput, setTagInput] = useState("");

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const addTag = (fieldName: string, max?: number) => {
    const tag = tagInput.trim().toLowerCase();
    // 立即清空输入框，防止重复添加
    setTagInput("");
    
    if (!tag) return;
    
    const currentTags = values[fieldName] || [];
    if (max && currentTags.length >= max) {
      return; // 已达到最大数量
    }
    
    if (!currentTags.includes(tag)) {
      handleChange(fieldName, [...currentTags, tag]);
    }
  };

  const removeTag = (fieldName: string, tag: string) => {
    handleChange(
      fieldName,
      values[fieldName].filter((t: string) => t !== tag)
    );
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  const isValid = fields.every((field) => {
    if (!field.required) return true;
    const value = values[field.name];
    if (field.type === "tags") return value.length > 0;
    return value !== "" && value !== undefined;
  });

  // 获取字段图标
  const getFieldIcon = (label: string) => {
    if (label.includes("单词")) return <BookOpen className="w-4 h-4 text-[#22C55E]" />;
    if (label.includes("配音")) return <Volume2 className="w-4 h-4 text-[#8B5CF6]" />;
    if (label.includes("重复")) return <Repeat className="w-4 h-4 text-[#F59E0B]" />;
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-white via-white to-gray-50/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100/50 overflow-hidden">
      {/* 头部装饰 */}
      <div className="h-2 bg-gradient-to-r from-[#22C55E] via-[#ADD8E6] to-[#8B5CF6]" />
      
      <div className="p-6 space-y-6">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>

        {/* 表单字段 */}
        <div className="space-y-5">
          {fields.map((field, index) => (
            <div 
              key={field.name} 
              className={`space-y-2.5 p-4 rounded-xl transition-all ${
                field.required && field.type === "tags" && values[field.name]?.length === 0
                  ? "bg-red-50/50 border border-red-100"
                  : "bg-gray-50/50 border border-transparent hover:bg-gray-50"
              }`}
            >
              <Label className="text-gray-700 font-medium flex items-center gap-2">
                {getFieldIcon(field.label)}
                <span>{field.label}</span>
                {field.required && (
                  <span className="text-red-400 text-xs">*</span>
                )}
              </Label>

              {field.type === "text" && (
                <Input
                  value={values[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-white border-gray-200 focus:border-[#22C55E] focus:ring-[#22C55E]/20"
                />
              )}

              {field.type === "textarea" && (
                <textarea
                  value={values[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full p-3 rounded-lg bg-white border border-gray-200 focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 outline-none resize-none h-24 transition-all"
                />
              )}

              {field.type === "select" && (
                <div className="relative">
                  <select
                    value={values[field.name]}
                    onChange={(e) => {
                      const value = field.options?.[0]?.value === 1 || field.options?.[0]?.value === 2
                        ? Number(e.target.value)
                        : e.target.value;
                      handleChange(field.name, value);
                    }}
                    className="w-full p-3 pr-10 rounded-lg bg-white border border-gray-200 focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 outline-none appearance-none cursor-pointer transition-all hover:border-gray-300"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}

              {field.type === "tags" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(field.name, field.max);
                        }
                      }}
                      placeholder={field.placeholder}
                      className="flex-1 bg-white border-gray-200 focus:border-[#22C55E] focus:ring-[#22C55E]/20"
                      disabled={!!(field.max && values[field.name]?.length >= field.max)}
                    />
                    <Button
                      type="button"
                      onClick={() => addTag(field.name, field.max)}
                      disabled={!tagInput.trim() || !!(field.max && values[field.name]?.length >= field.max)}
                      variant="outline"
                      size="icon"
                      className="border-gray-200 hover:border-[#22C55E] hover:bg-[#22C55E]/5"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* 标签展示 */}
                  {values[field.name]?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {values[field.name].map((tag: string, idx: number) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#22C55E]/10 to-[#22C55E]/5 text-[#22C55E] rounded-full text-sm font-medium border border-[#22C55E]/20 shadow-sm"
                        >
                          <span className="w-5 h-5 flex items-center justify-center bg-[#22C55E] text-white rounded-full text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="capitalize">{tag}</span>
                          <button
                            onClick={() => removeTag(field.name, tag)}
                            className="hover:bg-[#22C55E]/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* 数量提示 */}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>已添加 {values[field.name]?.length || 0} 个</span>
                    {field.max && <span>最多 {field.max} 个</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 提交按钮 */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#22C55E]/25 hover:shadow-xl hover:shadow-[#22C55E]/30 transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {submitText}
        </Button>
      </div>
    </div>
  );
}
