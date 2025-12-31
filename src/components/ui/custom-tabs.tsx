"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface CustomTabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  tabsListClassName?: string;
  tabsTriggerClassName?: string;
  tabsContentClassName?: string;
  variant?: "default" | "grid" | "underline" | "pills" | "segmented";
  size?: "sm" | "md" | "lg";
}

const variants = {
  default: {
    list: "bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg",
    trigger: "data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm",
  },
  grid: {
    list: "grid w-full bg-gray-100 dark:bg-gray-700/30 rounded-lg",
    trigger: "!py-3 !rounded-t-lg data-[state=active]:!shadow-sm dark:data-[state=active]:!bg-zinc-800 !text-center !transition-all !duration-200 data-[state=active]:!text-orange-600 dark:data-[state=active]:!text-orange-400",
  },
  underline: {
    list: "w-full border-b-[1.5px] border-gray-400 dark:border-gray-700 bg-transparent",
    trigger: "data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-4 py-2 text-sm font-medium transition-colors",
  },
  pills: {
    list: "bg-white dark:bg-gray-800 border-[1.5px] border-gray-400 dark:border-gray-700 rounded-lg p-1",
    trigger: "data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
  },
  segmented: {
    list: "grid w-full bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800",
    trigger: "rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm py-3 text-sm font-medium transition-all duration-200 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 data-[state=active]:scale-[1.02]",
  },
};

const sizes = {
  sm: {
    list: "",
    trigger: "text-sm px-2 py-2",
  },
  md: {
    list: "",
    trigger: "text-md px-3 py-3",
  },
  lg: {
    list: "",
    trigger: "text-base px-4 py-4",
  },
};

export function CustomTabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
  tabsListClassName,
  tabsTriggerClassName,
  tabsContentClassName,
  variant = "default",
  size = "md",
}: CustomTabsProps) {
  // 使用明确的 grid 列数类名，避免动态类名问题
  const gridColsMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  const gridCols = (variant === "grid" || variant === "segmented") ? gridColsMap[items.length] || `grid-cols-${items.length}` : "";

  return (
    <Tabs
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      <TabsList
        className={cn(
          variants[variant].list,
          sizes[size].list,
          gridCols,
          tabsListClassName
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              variants[variant].trigger,
              sizes[size].trigger,
              tabsTriggerClassName
            )}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className={cn("mt-4", tabsContentClassName)}
        >
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
