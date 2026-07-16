'use client'

import { useCallback, useRef, useState } from 'react'
import { UploadCloud, Loader2 } from 'lucide-react'

interface Props {
  onUpload?: (file: File) => void
  onUploadMultiple?: (files: FileList) => void
  accept?: string
  loading?: boolean
  title?: string
  subtitle?: string
  hint?: string
  multiple?: boolean
}

export default function UploadPanel({ onUpload, onUploadMultiple, accept = '.xlsx,.xls', loading = false, title = '点击或拖拽上传文件', subtitle = '支持常见数据格式', hint = '', multiple = false }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    if (multiple && onUploadMultiple) {
      onUploadMultiple(files)
    } else {
      const file = files[0]
      if (file && onUpload) onUpload(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [multiple, onUpload, onUploadMultiple])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (loading) return
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles, loading]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`w-full rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
        dragging
          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.03)] scale-[1.02] shadow-lg shadow-[hsl(var(--primary))]/10'
          : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--ring)/0.4)] hover:shadow-md'
      } ${loading ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center shadow-lg shadow-[hsl(var(--primary))]/30 transition-transform duration-300 ${dragging ? 'scale-110' : ''}`}>
        {loading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <UploadCloud className="w-8 h-8 text-white" />}
      </div>
      <h3 className="text-base font-medium text-[hsl(var(--foreground))] mb-1">{loading ? '正在读取文件...' : title}</h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</p>
      {hint && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{hint}</p>}
    </div>
  )
}
