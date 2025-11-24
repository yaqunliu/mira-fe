import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoadingIcon({ className }: { className?: string }) {
    return (
        <Loader className={cn("w-5 h-5 animate-spin-slow text-primary", className)} />
    )
}
