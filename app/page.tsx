'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calculator, FileCode, BarChart3, Database, Settings2,
  ArrowRight, Wrench, FolderOpen, Star, ShieldCheck,
  Clock, Search, X, LayoutGrid, Code2, Palette, Radio,
  GitMerge, MapPin, AlertTriangle
} from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import { useSearchStore } from '@/lib/search-store'

const categories = [
  { key: 'all', label: '全部', icon: LayoutGrid },
  { key: 'data', label: '数据处理', icon: Database },
  { key: 'dev', label: '开发工具', icon: Code2 },
  { key: 'design', label: '设计工具', icon: Palette },
  { key: 'visual', label: '数据可视化', icon: BarChart3 },
  { key: 'fav', label: '我的收藏', icon: Star },
]

const tools = [
  {
    id: 'kpi',
    name: 'Excel指标计算',
    desc: '上传Excel指标文件，自动解析公式并计算结果，支持多行对比分析',
    icon: Calculator,
    color: 'bg-emerald-500',
    colorLight: 'bg-emerald-50 text-emerald-600',
    path: '/kpi',
    tags: ['Excel', '公式'],
    category: 'data',
    categoryLabel: '数据处理',
    available: true,
  },
  {
    id: 'xml-reader',
    name: 'XML在线阅读器',
    desc: '支持多种XML结构自动识别解析，提供搜索、列筛选、分页浏览、CSV导出功能',
    icon: FileCode,
    color: 'bg-blue-500',
    colorLight: 'bg-blue-50 text-blue-600',
    path: '/xml',
    tags: ['XML', '解析'],
    category: 'dev',
    categoryLabel: '开发工具',
    available: true,
  },
  {
    id: 'rf-calculator',
    name: '4G/5G无线参数计算',
    desc: 'LTE EARFCN、5G NR-ARFCN、4G ECI、5G NCI 全功能查询与换算',
    icon: Radio,
    color: 'bg-sky-500',
    colorLight: 'bg-sky-50 text-sky-600',
    path: '/rf-calculator',
    tags: ['4G', '5G', 'RF'],
    category: 'dev',
    categoryLabel: '开发工具',
    available: true,
  },
  {
    id: 'csv-merge',
    name: 'CSV批量合并',
    desc: '按文件名前20位自动分组，批量合并CSV文件，支持GBK/UTF-8编码自动检测',
    icon: GitMerge,
    color: 'bg-teal-500',
    colorLight: 'bg-teal-50 text-teal-600',
    path: '/csv-merge',
    tags: ['CSV', '合并'],
    category: 'data',
    categoryLabel: '数据处理',
    available: true,
  },
  {
    id: 'json-formatter',
    name: 'JSON格式化',
    desc: 'JSON 美化、压缩、校验、转义，支持路径提取与对比差异',
    icon: FileCode,
    color: 'bg-violet-500',
    colorLight: 'bg-violet-50 text-violet-600',
    path: '/json-formatter',
    tags: ['JSON', '格式化'],
    category: 'dev',
    categoryLabel: '开发工具',
    available: true,
  },
  {
    id: 'base64-tool',
    name: 'Base64编解码',
    desc: '文本与图片的 Base64 编码解码，支持文件拖拽上传与批量处理',
    icon: FileCode,
    color: 'bg-indigo-500',
    colorLight: 'bg-indigo-50 text-indigo-600',
    path: '/base64-tool',
    tags: ['Base64', '编码'],
    category: 'dev',
    categoryLabel: '开发工具',
    available: true,
  },
  {
    id: 'color-picker',
    name: '颜色选择器',
    desc: 'HEX / RGB / HSL 互转，色板生成，对比度检查与渐变色生成',
    icon: Palette,
    color: 'bg-pink-500',
    colorLight: 'bg-pink-50 text-pink-600',
    path: '/color-picker',
    tags: ['颜色', '设计'],
    category: 'design',
    categoryLabel: '设计工具',
    available: true,
  },
  {
    id: 'regex-tester',
    name: '正则测试工具',
    desc: '实时正则表达式匹配测试，支持替换、分割与常用表达式库',
    icon: Search,
    color: 'bg-cyan-500',
    colorLight: 'bg-cyan-50 text-cyan-600',
    path: '/regex-tester',
    tags: ['正则', '匹配'],
    category: 'dev',
    categoryLabel: '开发工具',
    available: true,
  },
  {
    id: 'data-viz',
    name: '数据可视化看板',
    desc: '将指标数据转化为图表，支持折线图、柱状图、饼图等多种展示形式',
    icon: BarChart3,
    color: 'bg-orange-500',
    colorLight: 'bg-orange-50 text-orange-600',
    path: '/data-viz',
    tags: ['图表', 'SVG'],
    category: 'visual',
    categoryLabel: '数据可视化',
    available: true,
  },
  {
    id: 'sql-editor',
    name: 'SQL查询工具',
    desc: '在线SQL查询编辑器，支持多数据源连接、结果导出、历史记录管理',
    icon: Database,
    color: 'bg-rose-500',
    colorLight: 'bg-rose-50 text-rose-600',
    path: '#',
    tags: ['SQL', '查询'],
    category: 'data',
    categoryLabel: '数据处理',
    available: false,
  },
  {
    id: 'cell-map',
    name: '基站小区地理化展示',
    desc: '上传Excel文件，自动识别经纬度和方位角，在天地图上展示65°小区扇区',
    icon: MapPin,
    color: 'bg-green-600',
    colorLight: 'bg-green-50 text-green-600',
    path: '/cell-map',
    tags: ['地图', 'GIS'],
    category: 'visual',
    categoryLabel: '数据可视化',
    available: true,
  },
  {
    id: 'cell-analysis',
    name: '质差小区指标计算',
    desc: '语音质差+5G通用质差+高负荷小区综合分析，自动识别列名，支持阈值配置',
    icon: AlertTriangle,
    color: 'bg-amber-500',
    colorLight: 'bg-amber-50 text-amber-600',
    path: '/cell-analysis',
    tags: ['质差', '高负荷'],
    category: 'data',
    categoryLabel: '数据处理',
    available: true,
  },
]

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const hasAnimated = useRef(false)
  useEffect(() => {
    if (hasAnimated.current) { setValue(target); return }
    hasAnimated.current = true
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
  const [animatingFav, setAnimatingFav] = useState<string | null>(null)
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())
  const favorites = useFavStore((s) => s.favorites)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const isFav = useFavStore((s) => s.isFav)
  const searchQuery = useSearchStore((s) => s.query)
  const setSearchGlobal = useSearchStore((s) => s.setQuery)
  const router = useRouter()

  const availableTools = tools.filter((t) => t.available)
  const categorySet = new Set(availableTools.map((t) => t.category))

  const toolCount = useCountUp(tools.length)
  const catCount = useCountUp(categorySet.size)
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
    if (isFav(id) && activeCategory === 'fav') {
      setExitingIds((prev) => new Set(prev).add(id))
      setAnimatingFav(id)
      setTimeout(() => {
        toggleFav(id)
        setAnimatingFav(null)
        setExitingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 300)
    } else {
      setAnimatingFav(id)
      toggleFav(id)
      setTimeout(() => setAnimatingFav(null), 500)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[hsl(var(--primary))]/10 rounded-full blur-3xl pointer-events-none" />
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] mb-3 animate-fade-in-up">
          你的个人 <span className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(217,91%,60%)] bg-clip-text text-transparent">工具指挥中心</span>
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-base sm:text-lg max-w-2xl leading-relaxed animate-fade-in-up stagger-2">
          收集、整理、调用。所有数据仅存于浏览器本地，零后端依赖，隐私无忧。
        </p>
      </section>

      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat-card animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-wider">已收录工具</span>
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-[hsl(var(--primary))] group-hover:scale-110 transition-transform duration-300">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--foreground))] tabular-nums">{toolCount}</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">持续更新中</div>
          </div>

          <div className="stat-card animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-wider">工具分类</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--foreground))] tabular-nums">{catCount}</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">覆盖多场景</div>
          </div>

          <div className="stat-card animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-wider">我的收藏</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--foreground))] tabular-nums">{favCount}</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">快速访问常用</div>
          </div>

          <div className="stat-card animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-wider">本地存储</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--primary))] tabular-nums">100<span className="text-lg">%</span></div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">零后端依赖</div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-2 animate-fade-in-up stagger-3">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              aria-pressed={activeCategory === cat.key}
              className={`filter-chip ${activeCategory === cat.key ? 'active' : ''}`}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${activeCategory === cat.key ? 'scale-110' : ''}`} />
              {cat.label}
            </button>
          )
        })}
      </section>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="py-24 text-center animate-scale-in">
          <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-5 animate-float">
            <Search className="w-9 h-9 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">未找到相关工具</h3>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">尝试更换关键词或清除筛选条件</p>
          <button
            onClick={() => { setSearchGlobal(''); setActiveCategory('all') }}
            className="mt-5 px-5 py-2.5 bg-[hsl(var(--primary))] text-white rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all shadow-lg shadow-[hsl(var(--primary))]/20"
          >
            清除筛选
          </button>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool, idx) => {
            const Icon = tool.icon
            const fav = isFav(tool.id)
            const stagger = Math.min(idx + 1, 8)
            const comingSoon = !tool.available

            const card = (
              <div
                onMouseMove={handleMouseMove}
                className={`tool-card ${comingSoon ? 'coming-soon' : ''} ${exitingIds.has(tool.id) ? 'exiting' : ''} animate-fade-in-up stagger-${stagger}`}
              >
                {comingSoon ? (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs font-medium">
                      <Clock className="w-3 h-3" />即将上线
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleFavClick(e, tool.id)}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-all ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}
                    title={fav ? '取消收藏' : '收藏'}
                  >
                    <Star className={`w-4 h-4 ${fav ? 'fill-current' : ''} ${animatingFav === tool.id ? 'animate-heart-beat' : ''} transition-transform duration-200`} />
                  </button>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${tool.color} flex items-center justify-center text-white shadow-sm shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[hsl(var(--foreground))] text-base leading-tight truncate pr-6">{tool.name}</h3>
                    <span className={`category-badge mt-1 ${tool.colorLight} dark:bg-opacity-20`}>{tool.categoryLabel}</span>
                  </div>
                </div>

                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-2 mb-4">{tool.desc}</p>

                <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
                  <div className="flex gap-1.5 flex-wrap">
                    {tool.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {tool.available && (
                    <span className="inline-flex items-center text-xs font-medium text-[hsl(var(--primary))] group-hover:translate-x-1 transition-transform duration-300">
                      进入 <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </span>
                  )}
                </div>
              </div>
            )

            return comingSoon ? (
              <div key={tool.id} onClick={(e) => e.preventDefault()}>{card}</div>
            ) : (
              <div key={tool.id} onClick={() => router.push(tool.path)} className="group block cursor-pointer">{card}</div>
            )
          })}
        </section>
      )}
    </div>
  )
}
