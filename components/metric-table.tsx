'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { useToastStore } from '@/lib/toast-store'
import UnifiedTable from './unified-table'

function FormulaCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      addToast('公式已复制', 'success')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      addToast('复制失败', 'error')
    }
  }

  if (!value) return <span className="text-[hsl(var(--muted-foreground))]">-</span>
  return (
    <div className="flex items-start gap-2 w-full">
      <span className="flex-1 font-mono text-xs break-all whitespace-normal">{value}</span>
      <button onClick={handleCopy} className="copy-btn shrink-0" title="复制公式">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

export default function MetricTable() {
  const metrics = useKpiStore((s) => s.metrics)

  const columns = [
    { key: 'id', title: '指标ID', width: 160, sortable: true },
    { key: 'desc', title: '描述', sortable: true },
    {
      key: 'formula',
      title: '公式',
      cellClassName: '!whitespace-normal !break-all !max-w-none',
      render: (v: string) => <FormulaCell value={v} />,
    },
    {
      key: 'status',
      title: '状态',
      width: 80,
      align: 'center' as const,
      render: (v: string) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          {v}
        </span>
      ),
    },
  ]

  return (
    <UnifiedTable
      columns={columns}
      data={metrics}
      searchable
      searchKeys={['id', 'desc', 'formula']}
      showTotal
      rowClassName={(row) => row.formula ? 'bg-[hsl(var(--primary)/0.03)]' : ''}
    />
  )
}
