'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Download, FileCode, X, Home, Star, ChevronRight as ChevronRightIcon, XCircle, Info } from 'lucide-react'
import { useXmlStore } from '@/lib/xml-store'
import { parseXmlFile } from '@/lib/xml-parser'
import { useFavStore } from '@/lib/fav-store'
import UnifiedTable from '@/components/unified-table'
import UploadPanel from '@/components/upload-panel'

export default function XmlPage() {
  const loaded = useXmlStore((s) => s.loaded)
  const headers = useXmlStore((s) => s.headers)
  const allData = useXmlStore((s) => s.data)
  const fileName = useXmlStore((s) => s.fileName)
  const loadXml = useXmlStore((s) => s.loadXml)
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('xml-reader')
  const [errorMsg, setErrorMsg] = useState('')
  const [exportName, setExportName] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(async (file: File) => {
    setErrorMsg('')
    setUploading(true)
    try {
      const text = await file.text()
      const result = parseXmlFile(text)
      loadXml(result.headers, result.data, file.name)
      setExportName(`xml_export_${new Date().toISOString().slice(0, 10)}`)
    } catch (e: any) { setErrorMsg(e.message || '解析失败') } finally { setUploading(false) }
  }, [loadXml])

  const handleExport = () => {
    if (!headers.length || !allData.length) return
    const csvRows = [
      headers.join(','),
      ...allData.map((row: Record<string, string>) => headers.map((h: string) => { const v = row[h] || ''; return typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v }).join(','))
    ]
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    const safeName = (exportName.trim() || `xml_export_${new Date().toISOString().slice(0, 10)}`).replace(/[\\/:*?"<>|]/g, '_')
    a.download = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = headers.map(h => ({
    key: h,
    title: h,
    width: 140,
  }))

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span>开发工具</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">XML在线阅读器</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <FileCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">XML在线阅读器</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">支持多种XML结构自动识别，提供搜索、分页浏览、导出功能</p>
              </div>
            </div>
            <button onClick={() => toggleFav('xml-reader')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 min-h-[400px]">
          {!loaded ? (
            <div className="space-y-4">
              <UploadPanel onUpload={handleUpload} loading={uploading} accept=".xml,.csv" title="点击或拖拽上传 XML / CSV 文件" subtitle="支持 .xml / .csv 格式" />
              {errorMsg && (
                <div className="error-state flex items-start justify-between gap-2">
                  <span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg('')} className="shrink-0 hover:text-red-700 dark:hover:text-red-300 transition-colors" aria-label="关闭错误">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">使用说明</span>
                </div>
                <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <p><strong className="text-[hsl(var(--foreground))]">功能说明：</strong>上传 XML 或 CSV 文件，自动识别常见结构并展示为表格，支持搜索、排序、分页和导出。</p>
                  <p><strong className="text-[hsl(var(--foreground))]">支持格式：</strong></p>
                  <div className="pl-4 space-y-1">
                    <p>• <strong className="text-[hsl(var(--foreground))]">XML</strong>：自动识别 FieldName/FieldValue、smr/v、通用标签等多种结构</p>
                    <p>• <strong className="text-[hsl(var(--foreground))]">CSV</strong>：表头和数据值用 | 符号分隔，如 字段名1|字段名2|...</p>
                  </div>
                  <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
                  <div className="pl-4 space-y-1">
                    <p>1. 点击上传区域或拖拽文件到虚线框内</p>
                    <p>2. 系统自动解析并展示为表格</p>
                    <p>3. 使用搜索框快速定位数据，分页浏览大量记录</p>
                    <p>4. 点击「导出CSV」下载解析结果，点击「清除数据」可重新上传</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-scale-in space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium truncate max-w-[280px]" title={fileName}>
                  {fileName}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={exportName}
                    onChange={e => setExportName(e.target.value)}
                    placeholder="导出文件名"
                    className="form-input w-auto min-w-[180px] !py-1.5 !px-3 text-sm"
                  />
                  <button onClick={handleExport} className="btn-primary bg-blue-500 hover:bg-blue-600">
                    <Download className="w-4 h-4" /> 导出CSV
                  </button>
                </div>
              </div>
              <UnifiedTable
                columns={columns}
                data={allData}
                searchable
                searchKeys={headers}
                pagination
                pageSize={10}
                pageSizeOptions={[10, 20, 50, 100]}
                showTotal
              />
              <button onClick={() => useXmlStore.getState().clearData()} className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" /> 清除数据，重新上传
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


