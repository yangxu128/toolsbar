'use client'

import { useKpiStore } from '@/lib/store'
import UnifiedTable from './unified-table'

export default function DataTable() {
  const headers = useKpiStore((s) => s.headers)
  const rows = useKpiStore((s) => s.rows)

  const columns = headers.map((h, i) => ({
    key: String(i),
    title: h,
    width: 140,
  }))

  const data = rows.map(r => {
    const obj: Record<string, any> = {}
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
    />
  )
}
