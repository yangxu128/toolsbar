'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { FileCode, Home, Star, ChevronRight as ChevronRightIcon, Copy, Check, ArrowRightLeft, Upload } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

type Mode = 'encode' | 'decode'

export default function Base64ToolPage() {
  const isFav = useFavStore(s => s.isFav)
  const toggleFav = useFavStore(s => s.toggleFav)
  const fav = isFav('base64-tool')

  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('encode')
  const [copied, setCopied] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [urlSafe, setUrlSafe] = useState(false)

  const handleProcess = useCallback(() => {
    setError('')
    setOutput('')
    if (!input.trim()) return
    try {
      if (mode === 'encode') {
        const bytes = new TextEncoder().encode(input)
        let binary = ''
        bytes.forEach(b => binary += String.fromCharCode(b))
        let result = btoa(binary)
        if (urlSafe) result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        setOutput(result)
      } else {
        let str = input.trim()
        if (urlSafe) str = str.replace(/-/g, '+').replace(/_/g, '/')
        while (str.length % 4) str += '='
        const binary = atob(str)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const result = new TextDecoder().decode(bytes)
        setOutput(result)
      }
    } catch (e: any) {
      setError(mode === 'encode' ? '编码失败：输入内容包含无法处理的字符' : '解码失败：输入的 Base64 字符串格式不正确')
    }
  }, [input, mode, urlSafe])

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setOutput(base64)
      if (file.type.startsWith('image/')) setImagePreview(result)
      else setImagePreview(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDecodeFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => setInput(String(reader.result || '').trim())
    reader.readAsText(file)
  }, [])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  const handleSwap = useCallback(() => {
    if (!output || error) return
    setInput(output)
    setOutput('')
    setError('')
    setMode(mode === 'encode' ? 'decode' : 'encode')
  }, [output, error, mode])

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1"><Home className="w-4 h-4" />首页</Link>
        <ChevronRightIcon className="w-4 h-4" /><span>开发工具</span>
        <ChevronRightIcon className="w-4 h-4" /><span className="text-[hsl(var(--foreground))] font-medium">Base64编解码</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0"><FileCode className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Base64编解码</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">文本与图片的 Base64 编码解码</p>
              </div>
            </div>
            <button onClick={() => toggleFav('base64-tool')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}><Star className={`w-5 h-5 ${fav ? 'fill-current' : ''} ${fav ? 'animate-heart-beat' : ''}`} /></button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button onClick={() => setMode('encode')}
              className={`tab-pill ${mode === 'encode' ? 'active !bg-indigo-500 !border-indigo-500' : ''}`}>
              编码
            </button>
            <button onClick={() => setMode('decode')}
              className={`tab-pill ${mode === 'decode' ? 'active !bg-indigo-500 !border-indigo-500' : ''}`}>
              解码
            </button>
            <button onClick={() => setUrlSafe(v => !v)}
              className={`tab-pill text-[10px] ${urlSafe ? 'active !bg-indigo-500 !border-indigo-500' : ''}`}>
              URL Safe
            </button>
            {mode === 'encode' ? (
              <button onClick={() => {
                const inp = document.createElement('input')
                inp.type = 'file'
                inp.accept = 'image/*,.pdf,.txt'
                inp.onchange = (e: any) => e.target.files?.[0] && handleFileUpload(e.target.files[0])
                inp.click()
              }} className="tab-pill ml-auto">
                <Upload className="w-3 h-3" />上传文件
              </button>
            ) : (
              <button onClick={() => {
                const inp = document.createElement('input')
                inp.type = 'file'
                inp.accept = '.txt,.base64,.json'
                inp.onchange = (e: any) => e.target.files?.[0] && handleDecodeFileUpload(e.target.files[0])
                inp.click()
              }} className="tab-pill ml-auto">
                <Upload className="w-3 h-3" />上传文件
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">输入（{mode === 'encode' ? '文本' : 'Base64字符串'}）</span>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'encode' ? '输入要编码的文本...' : '输入Base64字符串...'}
                className="form-input h-60 p-3 text-xs font-mono resize-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">输出</span>
                <div className="flex items-center gap-2">
                  <button onClick={handleSwap} className="copy-btn hover:text-indigo-500"><ArrowRightLeft className="w-3 h-3" />交换</button>
                  <button onClick={handleCopy} className="copy-btn hover:text-indigo-500">
                    {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制</>}
                  </button>
                </div>
              </div>
              <textarea value={error || output} readOnly placeholder='处理结果...'
                className={`w-full h-60 p-3 rounded-xl border text-xs font-mono resize-none outline-none transition-all ${error ? 'error-state' : 'form-input'}`} />
            </div>
          </div>

          {imagePreview && (
            <div className="mt-4 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              <span className="text-xs text-[hsl(var(--muted-foreground))] mb-2 block">图片预览</span>
              <img src={imagePreview} alt="preview" className="max-h-40 rounded" />
            </div>
          )}

          <button onClick={handleProcess}
            className="mt-4 w-full btn-primary bg-indigo-500 hover:bg-indigo-600">
            {mode === 'encode' ? '编码' : '解码'}
          </button>

          <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
            <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
            <p>• 编码：将文本或文件转为Base64字符串，支持中文</p>
            <p>• 解码：将Base64字符串还原为文本</p>
            <p>• 支持上传图片文件，自动生成Base64并预览</p>
          </div>
        </div>
      </div>
    </div>
  )
}
