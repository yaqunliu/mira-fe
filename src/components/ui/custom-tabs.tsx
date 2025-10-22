"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

export interface TabItem {
  value: string;
  label: string;
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
  variant?: "default" | "grid" | "underline" | "pills";
  size?: "sm" | "md" | "lg";
}

const variants = {
  default: {
    list: "bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg",
    trigger: "data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm",
  },
  grid: {
    list: "grid w-full bg-gray-100 dark:bg-gray-700/30 rounded-lg",
    trigger: "py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-800 text-center transition-all duration-200",
  },
  underline: {
    list: "w-full border-b border-gray-200 dark:border-gray-700 bg-transparent",
    trigger: "data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-4 py-2 text-sm font-medium transition-colors",
  },
  pills: {
    list: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1",
    trigger: "data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
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
  const gridCols = variant === "grid" ? `grid-cols-${items.length}` : "";

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
