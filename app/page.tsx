'use client'

import Link from 'next/link'
import {
  Calculator, FileCode, BarChart3, Database, Settings2,
  ArrowRight, Wrench, FolderOpen, Heart, HardDrive
} from 'lucide-react'

const tools = [
  {
    id: 'kpi',
    name: '指标计算汇总分析',
    desc: '上传Excel指标文件，自动解析公式并计算结果，支持多行对比分析',
    icon: Calculator,
    color: 'hsl(var(--primary))',
    path: '/kpi',
    tags: ['Excel解析', '公式计算', '数据对比'],
  },
  {
    id: 'xml-reader',
    name: 'XML在线阅读器',
    desc: '支持多种XML结构自动识别解析，提供搜索、列筛选、分页浏览、CSV导出功能',
    icon: FileCode,
    color: 'hsl(160 60% 45%)',
    path: '/xml',
    tags: ['XML解析', '多结构识别', '筛选导出'],
  },
  {
    id: 'data-visual',
    name: '数据可视化看板',
    desc: '将指标数据转化为图表，支持折线图、柱状图、热力图等多种展示形式',
    icon: BarChart3,
    color: 'hsl(260 60% 55%)',
    path: '/visual',
    tags: ['图表', 'ECharts', '实时渲染'],
    comingSoon: true,
  },
  {
    id: 'db-query',
    name: '数据库查询工具',
    desc: '在线SQL查询编辑器，支持多数据源连接、结果导出、历史记录管理',
    icon: Database,
    color: 'hsl(25 90% 55%)',
    path: '/query',
    tags: ['SQL', '多数据源', '结果导出'],
    comingSoon: true,
  },
  {
    id: 'config-center',
    name: '配置管理中心',
    desc: '统一管理平台配置、工具参数、本地数据存储等全局设置项',
    icon: Settings2,
    color: 'hsl(340 70% 55%)',
    path: '/settings',
    tags: ['本地存储', '数据管理'],
  },
]

const stats = [
  { icon: Wrench, value: tools.filter(t => !t.comingSoon).length, label: '已收录工具' },
  { icon: FolderOpen, value: tools.length, label: '工具分类' },
  { icon: Heart, value: 0, label: '我的收藏' },
  { icon: HardDrive, value: '100%', label: '本地存储' },
]

export default function Home() {
  return (
    <>
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[hsl(var(--border))] text-xs font-medium text-muted mb-8">
            纯前端 · 本地存储 · 隐私无忧
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-5">
            你的个人
            <span className="gradient-text"> 工具指挥中心</span>
          </h1>

          <p className="text-base max-w-lg mx-auto mb-8 leading-relaxed text-muted">
            收集、整理、调用。所有数据仅存于浏览器本地，零后端依赖。
          </p>
        </div>
      </section>

      <section className="py-8 border-y border-dashed border-[hsl(var(--border))]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="text-2xl font-semibold tabular-nums mb-1">{s.value}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-1">工具库</h2>
            <p className="text-sm text-muted">选择一个工具开始使用</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map(tool => {
              const Icon = tool.icon
              const CardContent = (
                <div className="group relative p-5 rounded-lg card-dark cursor-pointer h-[260px] flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: tool.color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {tool.comingSoon && (
                      <span className="px-2 py-0.5 text-[11px] rounded-full bg-[hsl(var(--secondary))] text-muted border border-[hsl(var(--border))]">
                        敬请期待
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-medium mb-1 truncate">{tool.name}</h3>
                  <p className="text-xs leading-relaxed mb-3 line-clamp-2 text-muted min-h-[32px]">{tool.desc}</p>

                  <div className="flex flex-wrap gap-1 mb-3 mt-auto">
                    {tool.tags.map(tag => (
                      <span key={tag} className="tag-dark text-[10px] px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {!tool.comingSoon && (
                    <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
                      <span className="text-[11px] text-muted">点击进入</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-[hsl(var(--primary))] transition-all group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              )

              return tool.comingSoon
                ? <div key={tool.id}>{CardContent}</div>
                : <Link key={tool.id} href={tool.path}>{CardContent}</Link>
            })}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-lg p-8 sm:p-10 text-center card-dark">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary)/0.05)] to-[hsl(260_60%_55%/0.05)]" />
            <div className="relative">
              <h2 className="text-lg font-semibold mb-2">开始使用你的工具箱</h2>
              <p className="text-sm max-w-md mx-auto mb-6 text-muted">
                所有工具均在前端运行，数据存储于浏览器本地，安全高效。
              </p>
              <a href="#tools" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[hsl(var(--primary))] hover:opacity-90 text-white text-sm font-medium transition-opacity">
                浏览全部工具
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
