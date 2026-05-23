import { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error) {
    console.error('Route error caught:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="p-6 w-full flex items-center justify-center min-h-[400px]" 
          dir="rtl"
        >
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 max-w-lg w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center text-destructive">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">تعذر تحميل هذه الصفحة</h2>
              <p className="text-muted-foreground">حدث خطأ أثناء تحميل محتوى الصفحة. لا تقلق، باقي التطبيق يعمل بشكل طبيعي.</p>
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RefreshCw className="w-4 h-4" /> إعاد المحاولة
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" /> الرئيسية
              </Button>
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}
