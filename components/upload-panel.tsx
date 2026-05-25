'use client'

import { useCallback, useState } from 'react'
import { UploadCloud } from 'lucide-react'

interface Props {
  onUpload: (file: File) => void
}

export default function UploadPanel({ onUpload }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file?.name.match(/\.(xlsx|xls)$/i)) onUpload(file)
    },
    [onUpload]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('kpi-file-input')?.click()}
      className={`max-w-lg mx-auto rounded-lg border border-dashed p-12 text-center cursor-pointer transition-all ${
        dragging ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.03)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--ring)/0.4)]'
      }`}
    >
      <input id="kpi-file-input" type="file" accept=".xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        className="hidden"
      />
      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
        <UploadCloud className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-sm font-medium mb-1">上传指标Excel文件</h3>
      <p className="text-xs text-muted mb-2">点击或拖拽 .xlsx 文件到此区域</p>
      <div className="text-[11px] text-muted">需包含 Sheet0（数据）和 指标(计数器)（公式定义）</div>
    </div>
  )
}
