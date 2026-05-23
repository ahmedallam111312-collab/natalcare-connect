import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function AppLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row p-4 gap-4" dir="rtl">
      {/* Sidebar Placeholder */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden md:flex flex-col gap-4 w-64 h-[calc(100vh-2rem)] bg-card rounded-2xl p-4 border border-border"
      >
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
        
        <div className="mt-auto">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </motion.div>

      {/* Main Content Placeholder */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex flex-col gap-6"
      >
        {/* Header */}
        <div className="h-16 bg-card rounded-2xl border border-border flex items-center justify-between px-6">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl bg-card border border-border" />
          ))}
        </div>

        {/* Big Chart Area */}
        <div className="flex-1 min-h-[300px]">
          <Skeleton className="h-full w-full rounded-2xl bg-card border border-border" />
        </div>
      </motion.div>
    </div>
  );
}
