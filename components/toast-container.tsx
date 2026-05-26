'use client'

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/lib/toast-store'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10',
  error: 'text-red-500 border-red-500/20 bg-red-500/10',
  info: 'text-blue-500 border-blue-500/20 bg-blue-500/10',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (!toasts.length) return null

  return (
    <div className="fixed top-16 right-4 z-[100] space-y-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`animate-slide-in-right flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] max-w-sm ${colors[toast.type]}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-current opacity-30 toast-progress rounded-b-lg" />
          </div>
        )
      })}
    </div>
  )
}
