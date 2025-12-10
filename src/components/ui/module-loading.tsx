import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LoadingIcon from "./loading-icon";

interface ModuleLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  text?: string;
  coverFlowContainer?: boolean;
}

export default function ModuleLoading({
  loading,
  children,
  className = "",
  text = "加载中...",
  coverFlowContainer = false
}: ModuleLoadingProps) {
  const [flowContainer, setFlowContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (coverFlowContainer) {
      const container = document.getElementById("creation-flow-container");
      setFlowContainer(container);
    }
  }, [coverFlowContainer]);

  const loadingOverlay = loading && (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] rounded-lg opacity-80 flex-col gap-2">
      <LoadingIcon className="h-6 w-6" />
      <span className="text-sm text-white">{text}</span>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {children}
      {!coverFlowContainer && loadingOverlay}
      {coverFlowContainer && loading && flowContainer && createPortal(
        loadingOverlay,
        flowContainer
      )}
    </div>
  );
}

