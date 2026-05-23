import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-destructive text-destructive-foreground p-2 text-sm font-medium shadow-md"
          dir="rtl"
        >
          <WifiOff className="w-4 h-4" />
          <span>أنت حالياً غير متصل بالإنترنت. بعض الميزات قد لا تكون متاحة.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
