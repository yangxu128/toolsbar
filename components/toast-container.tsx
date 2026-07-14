'use client'

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/lib/toast-store'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const styles = {
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (!toasts.length) return null

  return (
    <div className="fixed top-20 right-2 left-2 sm:left-auto sm:right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type as keyof typeof icons] || Info
        return (
          <div
            key={toast.id}
            className={`animate-slide-in-right pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium relative overflow-hidden w-full sm:w-auto min-w-0 sm:min-w-[280px] max-w-sm ${styles[toast.type as keyof typeof styles] || ''}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 toast-progress" />
          </div>
        )
      })}
    </div>
  )
}
