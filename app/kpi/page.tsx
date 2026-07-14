'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Upload, FileSpreadsheet, Calculator, GitCompareArrows, Home, ChevronRight, Star, Loader2, RotateCcw } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { parseExcel } from '@/lib/calc'
import { useFavStore } from '@/lib/fav-store'
import { useToastStore } from '@/lib/toast-store'
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
  const [uploading, setUploading] = useState(false)
  const loaded = useKpiStore((s) => s.loaded)
  const loadFile = useKpiStore((s) => s.loadFile)
  const clearData = useKpiStore((s) => s.clearData)
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const addToast = useToastStore((s) => s.addToast)
  const fav = isFav('kpi')

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const data = parseExcel(buffer)
      loadFile(data.headers, data.rows, data.metrics)
      setActiveKey('data')
      addToast('文件解析成功', 'success')
    } catch (e: any) {
      addToast(`解析失败：${e?.message || e}`, 'error')
    } finally {
      setUploading(false)
    }
  }, [loadFile, addToast])

  const handleClear = useCallback(() => {
    clearData()
    setActiveKey('upload')
    addToast('已清除数据', 'info')
  }, [clearData, addToast])

  const visibleTabs = tabs.filter(t => t.key === 'upload' || loaded)

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span>数据处理</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">Excel指标计算</span>
      </nav>

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
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 min-h-[400px]">
          <div className="flex flex-wrap gap-2 mb-6">
            {visibleTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeKey === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveKey(tab.key)}
                  className={`tab-pill ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="animate-scale-in">
            {activeKey === 'upload' && (
              uploading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[hsl(var(--muted-foreground))]">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
                  <span className="text-sm">正在解析文件...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {loaded && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleClear}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary))] transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> 重新上传 / 清除数据
                      </button>
                    </div>
                  )}
                  <UploadPanel onUpload={handleUpload} />
                </div>
              )
            )}
            {activeKey === 'data' && loaded && <DataTable />}
            {activeKey === 'metrics' && loaded && <MetricTable />}
            {activeKey === 'calc' && loaded && <CalcGrid />}
            {activeKey === 'compare' && loaded && <CompareView />}
          </div>
        </div>
      </div>
    </div>
  )
}
