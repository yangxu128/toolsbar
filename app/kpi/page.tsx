'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Upload, FileSpreadsheet, Calculator, GitCompareArrows, Home, ChevronRight, Star } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { parseExcel } from '@/lib/calc'
import { useFavStore } from '@/lib/fav-store'
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
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('kpi')

  const handleUpload = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer()
    const data = parseExcel(buffer)
    loadFile(data.headers, data.rows, data.metrics)
    setActiveKey('data')
  }, [loadFile])

  const visibleTabs = tabs.filter(t => t.key === 'upload' || loaded)

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span>数据处理</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">Excel指标计算</span>
      </nav>

      {/* Tool Header */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Excel指标计算</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">上传Excel指标文件，自动解析公式并计算结果，支持多行对比分析</p>
              </div>
            </div>
            <button
              onClick={() => toggleFav('kpi')}
              className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}
              title={fav ? '取消收藏' : '收藏'}
            >
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 min-h-[400px]">
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
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
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
      </div>
    </div>
  )
}
