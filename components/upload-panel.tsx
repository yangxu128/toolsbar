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

      <div className="mt-6 text-left p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] space-y-2">
        <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
        <div className="text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
          <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>Excel 文件需包含两个 Sheet</p>
          <p>• Sheet0：原始数据，第一行为表头（列名需包含计数器ID，如 C616860001）</p>
          <p>• 指标(计数器)：公式定义，列依次为 指标ID、指标名称、公式、状态</p>
          <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
          <p>1. 上传 Excel 文件，系统自动解析数据和公式</p>
          <p>2. 在「指标计算」Tab 选择计算模式（单行/时间/子网/地市）</p>
          <p>3. 点击计算按钮，查看结果表格和计算过程卡片</p>
          <p>4. 支持导出 CSV，指标对比可选两行数据对比差异</p>
        </div>
      </div>
    </div>
  )
}
