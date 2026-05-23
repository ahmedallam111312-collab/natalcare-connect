import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  duration?: number;
}

export default function FadeIn({ 
  children, 
  delay = 0, 
  direction = 'up', 
  className = '',
  duration = 0.5 
}: FadeInProps) {
  
  const getInitialProps = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 20 };
      case 'down': return { opacity: 0, y: -20 };
      case 'left': return { opacity: 0, x: -20 };
      case 'right': return { opacity: 0, x: 20 };
      case 'none': return { opacity: 0 };
    }
  };

  const getAnimateProps = () => {
    switch (direction) {
      case 'up':
      case 'down': return { opacity: 1, y: 0 };
      case 'left':
      case 'right': return { opacity: 1, x: 0 };
      case 'none': return { opacity: 1 };
    }
  };

  return (
    <motion.div
      initial={getInitialProps()}
      animate={getAnimateProps()}
      transition={{
        duration,
        delay,
        ease: "easeOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
