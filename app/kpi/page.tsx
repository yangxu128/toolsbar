'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, Calculator, GitCompareArrows } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { parseExcel } from '@/lib/calc'
import UploadPanel from '@/components/upload-panel'
import DataTable from '@/components/data-table'
import MetricTable from '@/components/metric-table'
import CalcGrid from '@/components/calc-grid'
import CompareView from '@/components/compare-view'

const tabs = [
  { key: 'upload', label: '文件上传', icon: Upload },
  { key: 'data', label: '原始数据', icon: FileSpreadsheet },
  { key: 'metrics', label: '指标公式', icon: FileSpreadsheet },
  { key: 'calc', label: '指标计算', icon: Calculator },
  { key: 'compare', label: '指标对比', icon: GitCompareArrows },
]

export default function KpiPage() {
  const [activeKey, setActiveKey] = useState('upload')
  const loaded = useKpiStore((s) => s.loaded)
  const loadFile = useKpiStore((s) => s.loadFile)

  const handleUpload = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer()
    const data = parseExcel(buffer)
    loadFile(data.headers, data.rows, data.metrics)
    setActiveKey('data')
  }, [loadFile])

  const visibleTabs = tabs.filter(t => t.key === 'upload' || loaded)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">指标计算汇总分析</h2>
        <p className="text-sm text-muted mt-0.5">上传Excel指标文件，自动解析公式并计算结果，支持多行对比分析</p>
      </div>

      <nav className="flex gap-0 mb-6 border-b border-[hsl(var(--border))]">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
                isActive
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--foreground))]'
                  : 'border-transparent text-muted hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </nav>

      {activeKey === 'upload' && <UploadPanel onUpload={handleUpload} />}
      {activeKey === 'data' && loaded && <DataTable />}
      {activeKey === 'metrics' && loaded && <MetricTable />}
      {activeKey === 'calc' && loaded && <CalcGrid />}
      {activeKey === 'compare' && loaded && <CompareView />}
    </div>
  )
}
