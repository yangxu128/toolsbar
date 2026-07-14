'use client'

import { useKpiStore } from '@/lib/store'
import UnifiedTable from './unified-table'

export default function DataTable() {
  const headers = useKpiStore((s) => s.headers)
  const rows = useKpiStore((s) => s.rows)

  const columns = [
    { key: '__rowNum__', title: '#', width: 60, align: 'center' as const },
    ...headers.map((h, i) => ({
      key: String(i),
      title: h,
      width: 140,
    })),
  ]

  const data = rows.map((r, idx) => {
    const obj: Record<string, any> = { __rowNum__: idx + 1 }
    r.forEach((c: any, i: number) => { obj[String(i)] = c })
    return obj
  })

  return (
    <UnifiedTable
      columns={columns}
      data={data}
      searchable
      showTotal
      rowKey={(_, i) => i}
      stickyFirstColumn
    />
  )
}
