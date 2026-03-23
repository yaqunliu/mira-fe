"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

interface DraggableProgressCardProps {
  status: string;
  progress: number;
  currentStep: string;
}

export function DraggableProgressCard({ status, progress, currentStep }: DraggableProgressCardProps) {
  const t = useTranslations("createAgent");
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      let newX = dragStartRef.current.posX + deltaX;
      let newY = dragStartRef.current.posY + deltaY;
      
      // 允许拖动到负坐标（部分隐藏在左侧）
      const minX = -240; // 卡片宽度 256px，允许大部分隐藏在左侧
      const minY = 0;
      const maxX = window.innerWidth - 40; // 允许部分隐藏在右侧
      const maxY = window.innerHeight - 80;
      
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    
    setIsDragging(true);
  };

  return (
    <div
      ref={cardRef}
      className={`fixed w-64 bg-black rounded-xl shadow-2xl border border-gray-600 p-4 z-50 select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(0, 0)",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-white">{t("generating")}</span>
        </div>
        <span className="text-xs text-gray-300 uppercase">{status}</span>
      </div>
      
      <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300">{currentStep}</span>
        <span className="text-blue-400 font-medium">{progress}%</span>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 pointer-events-none">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span>{t("draggableCard.dragToMove")}</span>
        </div>
      </div>
    </div>
  );
}
