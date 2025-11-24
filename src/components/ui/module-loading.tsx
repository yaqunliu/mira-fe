import LoadingIcon from "./loading-icon";

interface ModuleLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  text?: string;
}

export default function ModuleLoading({ 
  loading, 
  children, 
  className = "", 
  text = "加载中..."
}: ModuleLoadingProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg opacity-80 flex-col gap-2">
          {/* <div className="bg-white/10 p-4 rounded-full"> */}
            <LoadingIcon className="h-6 w-6" />
            <span className="text-sm text-white">{text}</span>
          {/* </div> */}
        </div>
      )}
    </div>
  );
}

