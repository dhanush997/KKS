"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "info";
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback(({ title, description, variant = "default" }: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      dismiss(id);
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 md:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md",
                {
                  "bg-background/95 text-foreground border-border": t.variant === "default",
                  "bg-emerald-950/90 text-emerald-100 border-emerald-800/50": t.variant === "success",
                  "bg-red-950/90 text-red-100 border-red-800/50": t.variant === "destructive",
                  "bg-blue-950/90 text-blue-100 border-blue-800/50": t.variant === "info",
                }
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {t.variant === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {t.variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-400" />}
                {t.variant === "info" && <Info className="h-5 w-5 text-blue-400" />}
                {t.variant === "default" && <Info className="h-5 w-5 text-muted-foreground" />}
              </div>

              {/* Text Content */}
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-semibold leading-none">{t.title}</h4>
                {t.description && (
                  <p className={cn("text-xs leading-normal opacity-90", {
                    "text-muted-foreground": t.variant === "default",
                    "text-emerald-200": t.variant === "success",
                    "text-red-200": t.variant === "destructive",
                    "text-blue-200": t.variant === "info",
                  })}>
                    {t.description}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 rounded-md p-1 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
