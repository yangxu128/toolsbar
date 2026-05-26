'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Calculator, FileCode, BarChart3, Database, Settings2,
  ArrowRight, Wrench, FolderOpen, Heart, HardDrive,
  Star, Clock, Search, X
} from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

const categories = [
  { key: 'all', label: '全部' },
  { key: 'data', label: '数据处理' },
  { key: 'dev', label: '开发工具' },
  { key: 'design', label: '设计工具' },
  { key: 'visual', label: '可视化' },
  { key: 'fav', label: '我的收藏' },
]

const tools = [
  {
    id: 'kpi',
    name: '指标计算汇总分析',
    desc: '上传Excel指标文件，自动解析公式并计算结果，支持多行对比分析',
    icon: Calculator,
    color: '#2563EB',
    bgColor: 'bg-blue-500/10',
    path: '/kpi',
    tags: ['Excel', '公式计算', '数据对比'],
    category: 'data',
  },
  {
    id: 'xml-reader',
    name: 'XML在线阅读器',
    desc: '支持多种XML结构自动识别解析，提供搜索、列筛选、分页浏览、CSV导出功能',
    icon: FileCode,
    color: '#059669',
    bgColor: 'bg-emerald-500/10',
    path: '/xml',
    tags: ['XML', '多结构识别', '筛选导出'],
    category: 'data',
  },
  {
    id: 'data-visual',
    name: '数据可视化看板',
    desc: '将指标数据转化为图表，支持折线图、柱状图、热力图等多种展示形式',
    icon: BarChart3,
    color: '#7C3AED',
    bgColor: 'bg-violet-500/10',
    path: '/visual',
    tags: ['ECharts', '图表', '实时渲染'],
    category: 'visual',
    comingSoon: true,
  },
  {
    id: 'db-query',
    name: '数据库查询工具',
    desc: '在线SQL查询编辑器，支持多数据源连接、结果导出、历史记录管理',
    icon: Database,
    color: '#D97706',
    bgColor: 'bg-amber-500/10',
    path: '/query',
    tags: ['SQL', '多数据源', '结果导出'],
    category: 'dev',
    comingSoon: true,
  },
  {
    id: 'config-center',
    name: '配置管理中心',
    desc: '统一管理平台配置、工具参数、本地数据存储等全局设置项',
    icon: Settings2,
    color: '#DB2777',
    bgColor: 'bg-pink-500/10',
    path: '/settings',
    tags: ['本地存储', '数据管理'],
    category: 'dev',
  },
]

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [animatingFav, setAnimatingFav] = useState<string | null>(null)
  const favorites = useFavStore((s) => s.favorites)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const isFav = useFavStore((s) => s.isFav)

  const availableCount = useCountUp(tools.filter((t) => !t.comingSoon).length)
  const totalCount = useCountUp(tools.length)
  const favCount = useCountUp(favorites.length)

  const filteredTools = useMemo(() => {
    let result = tools
    if (activeCategory === 'fav') {
      result = result.filter((t) => isFav(t.id))
    } else if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }
    return result
  }, [activeCategory, searchQuery, favorites])

  const handleFavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setAnimatingFav(id)
    toggleFav(id)
    setTimeout(() => setAnimatingFav(null), 400)
  }

  return (
    <>
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--border))] text-xs font-medium text-muted mb-6">
            纯前端 · 本地存储 · 隐私无忧
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
            你的个人
            <span className="gradient-text"> 工具指挥中心</span>
          </h1>

          <p className="text-base max-w-lg mx-auto mb-8 leading-relaxed text-muted">
            收集、整理、调用。所有数据仅存于浏览器本地，零后端依赖。
          </p>

          <div className="relative max-w-md mx-auto mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              placeholder="搜索工具名称、描述或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-muted transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[hsl(var(--foreground))]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 border-y border-dashed border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Wrench, value: availableCount, label: '已收录工具', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { icon: FolderOpen, value: totalCount, label: '工具分类', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { icon: Heart, value: favCount, label: '我的收藏', color: 'text-pink-500', bg: 'bg-pink-500/10' },
              { icon: HardDrive, value: '100%', label: '本地存储', color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((s) => (
              <div
                key={s.label}
                className="card-dark p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums animate-count-up">{s.value}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-1">工具库</h2>
              <p className="text-sm text-muted">选择一个工具开始使用</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeCategory === cat.key
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'bg-[hsl(var(--secondary))] text-muted hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
              <p className="text-sm text-muted mb-2">没有找到匹配的工具</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all') }}
                className="text-xs text-[hsl(var(--primary))] hover:underline"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool, index) => {
                const Icon = tool.icon
                const fav = isFav(tool.id)
                const CardContent = (
                  <div
                    className={`group relative p-6 rounded-2xl card-dark cursor-pointer h-[280px] flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      tool.comingSoon ? 'opacity-60' : ''
                    }`}
                    style={{
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                        style={{ background: tool.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!tool.comingSoon && (
                          <button
                            onClick={(e) => handleFavClick(e, tool.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              fav ? 'text-amber-400' : 'text-muted hover:text-amber-400'
                            } ${animatingFav === tool.id ? 'animate-heart-beat' : ''}`}
                          >
                            <Star className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                          </button>
                        )}
                        {tool.comingSoon && (
                          <span className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-full bg-[hsl(var(--secondary))] text-muted border border-[hsl(var(--border))]">
                            <Clock className="w-3 h-3" /> 即将上线
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold mb-1.5 truncate">{tool.name}</h3>
                    <p className="text-xs leading-relaxed text-muted line-clamp-2 min-h-[36px]">
                      {tool.desc}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-auto pt-4">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="tag-dark text-[10px] px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {!tool.comingSoon && (
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
                        <span className="text-[11px] text-muted">点击进入</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    )}
                  </div>
                )

                return tool.comingSoon ? (
                  <div key={tool.id} className="animate-fade-in-up">
                    {CardContent}
                  </div>
                ) : (
                  <Link key={tool.id} href={tool.path} className="animate-fade-in-up">
                    {CardContent}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-2xl p-10 sm:p-12 text-center card-dark">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary)/0.05)] to-[hsl(262_83%_58%/0.05)]" />
            <div className="relative">
              <h2 className="text-xl font-semibold mb-2">开始使用你的工具箱</h2>
              <p className="text-sm max-w-md mx-auto mb-6 text-muted">
                所有工具均在前端运行，数据存储于浏览器本地，安全高效。
              </p>
              <a
                href="#tools"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 text-white text-sm font-medium transition-opacity"
              >
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
