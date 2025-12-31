import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutosizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

export const AutosizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutosizeTextareaProps
>(({ className, minRows = 1, maxRows, onChange, value, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Combine refs
  React.useImperativeHandle(ref, () => textareaRef.current!);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // We need to reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    
    const style = window.getComputedStyle(textarea);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderBottom = parseFloat(style.borderBottomWidth);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const lineHeight = parseFloat(style.lineHeight);
    
    let height = textarea.scrollHeight;
    
    // Calculate min height based on minRows
    if (minRows) {
        const minHeight = (minRows * lineHeight) + paddingTop + paddingBottom + borderTop + borderBottom;
        height = Math.max(height, minHeight);
    }

    // Calculate max height based on maxRows
    if (maxRows) {
        const maxHeight = (maxRows * lineHeight) + paddingTop + paddingBottom + borderTop + borderBottom;
        if (height > maxHeight) {
            height = maxHeight;
            textarea.style.overflowY = "auto";
        } else {
            textarea.style.overflowY = "hidden";
        }
    } else {
        textarea.style.overflowY = "hidden";
    }

    textarea.style.height = `${height}px`;
  }, [minRows, maxRows]);

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      rows={minRows}
    />
  );
});

AutosizeTextarea.displayName = "AutosizeTextarea";
