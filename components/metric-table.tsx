'use client'

import { useKpiStore } from '@/lib/store'
import UnifiedTable from './unified-table'

export default function MetricTable() {
  const metrics = useKpiStore((s) => s.metrics)

  const columns = [
    { key: 'id', title: '指标ID', width: 160, sortable: true },
    { key: 'desc', title: '描述', sortable: true },
    { key: 'formula', title: '公式', width: 280 },
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
      searchKeys={['id', 'desc']}
      showTotal
      rowClassName={(row) => row.formula ? 'bg-[hsl(var(--primary)/0.03)]' : ''}
    />
  )
}
