import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { X, Download, Star, StarOff, Play, Pause, Volume2, VolumeX, File } from 'lucide-react'
import Tooltip from './Tooltip.jsx'
import { formatSize } from '../utils/fileUtils.js'
import { filesApi } from '../api/files.js'

/* ─── Kind detection ──────────────────────────────────────────────────────── */

function getExt(item) {
  if (item.extension) return item.extension.toLowerCase()
  const name = item.name || ''
  const dot  = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function getPreviewKind(item) {
  const mime = item.mimeType ?? ''
  const ext  = getExt(item)
  if (mime.startsWith('image/'))  return 'image'
  if (mime.startsWith('video/'))  return 'video'
  if (mime.startsWith('audio/'))  return 'audio'
  if (mime === 'application/pdf') return 'pdf'
  const CODE_EXTS = [
    'js','ts','jsx','tsx','vue','svelte','py','go','rs','rb','php','html','css','scss','less',
    'json','yaml','yml','xml','sh','bash','c','cpp','h','java','sql','md','txt','env',
    'toml','ini','conf','lock','kt','swift','dart','r','lua',
  ]
  if (CODE_EXTS.includes(ext) || mime.startsWith('text/')) return 'code'
  return 'other'
}

function getLang(ext) {
  if (['js','jsx','ts','tsx','vue','svelte'].includes(ext)) return 'js'
  if (ext === 'py')   return 'py'
  if (ext === 'go')   return 'go'
  if (ext === 'rs')   return 'rust'
  if (ext === 'md')   return 'md'
  if (['css','scss','less'].includes(ext)) return 'css'
  if (['html','xml','svg'].includes(ext))  return 'html'
  if (ext === 'json') return 'json'
  if (['sh','bash'].includes(ext)) return 'sh'
  if (ext === 'sql')  return 'sql'
  if (['c','cpp','h'].includes(ext)) return 'c'
  if (ext === 'java') return 'java'
  if (ext === 'rb')   return 'ruby'
  if (ext === 'php')  return 'php'
  return 'text'
}

/* ─── Syntax highlighter ──────────────────────────────────────────────────── */

const KW = {
  js: new Set([
    'break','case','catch','class','const','continue','debugger','default','delete','do','else',
    'export','extends','finally','for','from','function','get','if','import','in','instanceof',
    'let','new','null','of','return','set','static','super','switch','this','throw','true','false',
    'typeof','undefined','var','void','while','with','yield','async','await',
    'type','interface','enum','implements','abstract','declare','readonly','as','keyof',
    'namespace','module','satisfies','infer','is','never','unknown','any',
  ]),
  py: new Set([
    'False','None','True','and','as','assert','async','await','break','class','continue','def',
    'del','elif','else','except','finally','for','from','global','if','import','in','is','lambda',
    'nonlocal','not','or','pass','raise','return','try','while','with','yield','self','super',
  ]),
  go: new Set([
    'break','case','chan','const','continue','default','defer','else','fallthrough','for','func',
    'go','goto','if','import','interface','map','package','range','return','select','struct',
    'switch','type','var','nil','true','false','iota','make','new','len','cap','append','copy',
    'delete','close','panic','recover',
  ]),
  rust: new Set([
    'as','async','await','break','const','continue','crate','dyn','else','enum','extern','false',
    'fn','for','if','impl','in','let','loop','match','mod','move','mut','pub','ref','return',
    'self','super','trait','true','type','unsafe','use','where','while',
  ]),
  c: new Set([
    'auto','break','case','char','const','continue','default','do','double','else','enum','extern',
    'float','for','goto','if','inline','int','long','register','return','short','signed','sizeof',
    'static','struct','switch','typedef','union','unsigned','void','volatile','while','NULL','true','false','bool',
  ]),
  java: new Set([
    'abstract','assert','boolean','break','byte','case','catch','char','class','const','continue',
    'default','do','double','else','enum','extends','final','finally','float','for','if','implements',
    'import','instanceof','int','interface','long','native','new','package','private','protected',
    'public','return','short','static','super','switch','synchronized','this','throw','throws',
    'transient','try','void','volatile','while','true','false','null',
  ]),
  ruby: new Set([
    'BEGIN','END','alias','and','begin','break','case','class','def','defined','do','else','elsif',
    'end','ensure','false','for','if','in','module','next','nil','not','or','redo','rescue','retry',
    'return','self','super','then','true','undef','unless','until','when','while','yield',
  ]),
  php: new Set([
    'abstract','array','as','break','case','catch','class','clone','const','continue','declare',
    'default','do','echo','else','elseif','empty','extends','final','finally','for','foreach',
    'function','global','if','implements','include','instanceof','interface','isset','list',
    'match','namespace','new','null','or','print','private','protected','public','readonly',
    'require','return','static','switch','throw','trait','true','false','try','unset','use','while','fn',
  ]),
  sh: new Set([
    'if','then','else','elif','fi','case','esac','for','while','until','do','done','in',
    'function','return','local','export','readonly','declare','echo','printf','exit','true','false',
  ]),
  sql: new Set([
    'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','AS','JOIN','LEFT','RIGHT','INNER',
    'OUTER','ON','GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES','UPDATE',
    'SET','DELETE','CREATE','TABLE','INDEX','VIEW','DROP','ALTER','ADD','COLUMN','PRIMARY','KEY',
    'FOREIGN','REFERENCES','UNIQUE','DEFAULT','DISTINCT','COUNT','SUM','AVG','MAX','MIN',
    'select','from','where','and','or','not','in','is','null','as','join','left','right','inner',
    'outer','on','group','by','order','having','limit','offset','insert','into','values','update',
    'set','delete','create','table','index','view','drop','alter','add','primary','key',
    'references','unique','default','distinct','count','sum','avg','max','min',
  ]),
}

const LINE_CMT  = { js:'//','py':'#','go':'//','rust':'//','c':'//','java':'//','ruby':'#','php':'//','sh':'#','sql':'--' }
const BLOCK_CMT = { js:['/*','*/'],'css':['/*','*/'],'c':['/*','*/'],'java':['/*','*/'],'go':['/*','*/'],'rust':['/*','*/'],'php':['/*','*/'],'html':['<!--','-->'] }

const T = { C:'c', S:'s', K:'k', N:'n', O:'o', I:'i', SP:'sp' }

const TOKEN_STYLE = {
  c:  { color:'rgba(255,255,255,0.28)', fontStyle:'italic' },
  s:  { color:'rgba(255,255,255,0.62)' },
  k:  { color:'rgba(255,255,255,1.00)', fontWeight: 500 },
  n:  { color:'rgba(255,255,255,0.65)' },
  o:  { color:'rgba(255,255,255,0.40)' },
  i:  { color:'rgba(255,255,255,0.72)' },
  sp: {},
}

function tokenizeLine(line, lang, bs) {
  const toks = []
  let pos = 0
  const kw   = KW[lang] || new Set()
  const lcmt = LINE_CMT[lang]
  const bcmt = BLOCK_CMT[lang]

  function push(text, type) {
    if (!text) return
    const last = toks[toks.length - 1]
    if (last && last.t === type) last.v += text
    else toks.push({ v: text, t: type })
  }

  while (pos < line.length) {
    const c = line[pos]

    if (bs.inBlock) {
      if (bcmt && line.startsWith(bcmt[1], pos)) {
        push(bcmt[1], T.C); pos += bcmt[1].length; bs.inBlock = false; continue
      }
      push(c, T.C); pos++; continue
    }

    if (bcmt && line.startsWith(bcmt[0], pos)) {
      const end = line.indexOf(bcmt[1], pos + bcmt[0].length)
      if (end === -1) { push(line.slice(pos), T.C); bs.inBlock = true; break }
      push(line.slice(pos, end + bcmt[1].length), T.C); pos = end + bcmt[1].length; continue
    }

    if (lcmt && line.startsWith(lcmt, pos)) { push(line.slice(pos), T.C); break }

    if (c === '"' || c === "'" || c === '`') {
      let j = pos + 1
      while (j < line.length) {
        if (line[j] === '\\' && j + 1 < line.length) { j += 2; continue }
        if (line[j] === c) { j++; break }
        j++
      }
      push(line.slice(pos, j), T.S); pos = j; continue
    }

    if (/[a-zA-Z_$]/.test(c)) {
      let j = pos
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++
      const word = line.slice(pos, j)
      push(word, kw.has(word) ? T.K : T.I); pos = j; continue
    }

    if (/[0-9]/.test(c) && (pos === 0 || !/[a-zA-Z_$]/.test(line[pos - 1]))) {
      let j = pos
      while (j < line.length && /[0-9._xXa-fA-FbBoO]/.test(line[j])) j++
      push(line.slice(pos, j), T.N); pos = j; continue
    }

    if (c === ' ' || c === '\t') {
      let j = pos
      while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++
      push(line.slice(pos, j), T.SP); pos = j; continue
    }

    push(c, T.O); pos++
  }

  return toks.length ? toks : [{ v: '\u200b', t: T.SP }]
}

function highlightCode(code, ext) {
  const lang  = getLang(ext)
  const lines = code.split('\n')
  const bs    = { inBlock: false }
  return { lang, lines: lines.map(line => tokenizeLine(line, lang, bs)) }
}

/* ─── Markdown renderer ───────────────────────────────────────────────────── */

function parseInline(text) {
  const parts = []; let pos = 0; let key = 0
  while (pos < text.length) {
    if (text.startsWith('**', pos)) {
      const end = text.indexOf('**', pos + 2)
      if (end !== -1) { parts.push(<strong key={key++} className="text-white font-bold">{text.slice(pos + 2, end)}</strong>); pos = end + 2; continue }
    }
    if (text[pos] === '*' && text[pos + 1] !== '*') {
      const end = text.indexOf('*', pos + 1)
      if (end !== -1) { parts.push(<em key={key++} className="text-white/70 italic">{text.slice(pos + 1, end)}</em>); pos = end + 1; continue }
    }
    if (text[pos] === '`') {
      const end = text.indexOf('`', pos + 1)
      if (end !== -1) { parts.push(<code key={key++} className="font-mono text-white/60 bg-white/[0.06] px-1">{text.slice(pos + 1, end)}</code>); pos = end + 1; continue }
    }
    let j = pos
    while (j < text.length && !['*', '`'].includes(text[j])) j++
    parts.push(<span key={key++}>{j > pos ? text.slice(pos, j) : text[pos]}</span>)
    pos = j > pos ? j : pos + 1
  }
  return parts
}

function preprocessMarkdown(code) {
  let inCB = false
  return code.split('\n').map(line => {
    if (line.startsWith('```')) { inCB = !inCB; return { t: 'fence', text: line } }
    if (inCB) return { t: 'cb', text: line }
    const hm = line.match(/^(#{1,6})\s+(.*)/)
    if (hm)  return { t: 'h', level: hm[1].length, text: hm[2] }
    if (line.startsWith('> ')) return { t: 'bq', text: line.slice(2) }
    if (/^[-*_]{3,}\s*$/.test(line)) return { t: 'hr' }
    const lm = line.match(/^(\s*)([-*+]|\d+\.)\s(.*)/)
    if (lm)  return { t: 'li', indent: lm[1].length, bullet: lm[2], text: lm[3] }
    if (!line.trim()) return { t: 'br' }
    return { t: 'p', text: line }
  })
}

const H_SIZE  = [22, 18, 16, 14, 13, 12]
const H_ALPHA = [0.97, 0.90, 0.83, 0.76, 0.70, 0.64]

function MdLine({ node }) {
  if (node.t === 'h')    return <div style={{ fontSize: H_SIZE[node.level - 1], fontWeight: 700, color: `rgba(255,255,255,${H_ALPHA[node.level - 1]})`, paddingTop: node.level <= 2 ? 16 : 8, paddingBottom: 4, lineHeight: 1.3 }}>{parseInline(node.text)}</div>
  if (node.t === 'bq')   return <div className="border-l-2 border-white/15 pl-3 text-white/40 italic">{parseInline(node.text)}</div>
  if (node.t === 'hr')   return <div className="border-t border-white/10 my-3" />
  if (node.t === 'br')   return <div className="h-3" />
  if (node.t === 'fence') return <div className="font-mono text-[11px] text-white/25">{node.text}</div>
  if (node.t === 'cb')   return <div className="font-mono text-[12px] text-white/62 bg-white/[0.03] pl-2 leading-5">{node.text || '\u00a0'}</div>
  if (node.t === 'li')   return <div className="flex gap-2 text-white/72 leading-6" style={{ paddingLeft: 8 + node.indent * 12 }}><span className="text-white/30 shrink-0 select-none">{/\d/.test(node.bullet) ? node.bullet : '·'}</span><span>{parseInline(node.text)}</span></div>
  return <div className="text-white/72 leading-6">{parseInline(node.text)}</div>
}

/* ─── Image ───────────────────────────────────────────────────────────────── */
function ImagePreview({ item }) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6">
      <img
        src={filesApi.previewUrl(item.id)}
        alt={item.name}
        className="max-w-full max-h-full object-contain select-none"
        draggable={false}
        style={{ display: 'block' }}
      />
    </div>
  )
}

/* ─── Video ───────────────────────────────────────────────────────────────── */
function VideoPreview({ item }) {
  return (
    <div className="flex-1 min-h-0 bg-black relative">
      <video
        src={filesApi.previewUrl(item.id)}
        controls
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'contain', outline: 'none' }}
      />
    </div>
  )
}

/* ─── Audio ───────────────────────────────────────────────────────────────── */
const FALLBACK_BARS = Array.from({ length: 64 }, (_, i) =>
  20 + Math.abs(Math.sin(i * 0.7) * 35 + Math.sin(i * 2.1) * 20)
)
const BAR_COUNT = 64

function AudioPreview({ item }) {
  const audioRef    = useRef(null)
  const barRef      = useRef(null)
  const ctxRef      = useRef(null)
  const analyserRef = useRef(null)
  const rafRef      = useRef(null)
  const isDragging  = useRef(false)

  const [playing,    setPlaying]    = useState(false)
  const [current,    setCurrent]    = useState(0)
  const [duration,   setDuration]   = useState(0)
  const [muted,      setMuted]      = useState(false)
  const [waveform,   setWaveform]   = useState(null)
  const [liveBars,   setLiveBars]   = useState(null)

  /* Decode static waveform */
  useEffect(() => {
    let cancelled = false
    if ((item.size ?? 0) > 20 * 1024 * 1024) {
      setWaveform(FALLBACK_BARS)
      return
    }
    fetch(filesApi.previewUrl(item.id), { credentials: 'include' })
      .then(r => r.arrayBuffer())
      .then(buf => {
        const ac = new AudioContext()
        return ac.decodeAudioData(buf).then(decoded => {
          ac.close()
          if (cancelled) return null
          const ch   = decoded.getChannelData(0)
          const step = Math.max(1, Math.floor(ch.length / BAR_COUNT))
          const raw  = Array.from({ length: BAR_COUNT }, (_, i) => {
            let sum = 0; const end = Math.min((i + 1) * step, ch.length)
            for (let j = i * step; j < end; j++) sum += Math.abs(ch[j])
            return sum / (end - i * step)
          })
          const max = Math.max(...raw) || 1
          return raw.map(v => 8 + (v / max) * 80)
        })
      })
      .then(bars => { if (!cancelled && bars) setWaveform(bars) })
      .catch(() => { if (!cancelled) setWaveform(FALLBACK_BARS) })
    return () => { cancelled = true }
  }, [item.id, item.size])

  /* Set up AudioContext once on first play */
  const setupAnalyser = useCallback(() => {
    const audio = audioRef.current
    if (!audio || ctxRef.current) return
    try {
      const ac      = new AudioContext()
      const analyser = ac.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      ac.createMediaElementSource(audio).connect(analyser)
      analyser.connect(ac.destination)
      ctxRef.current      = ac
      analyserRef.current = analyser
    } catch {}
  }, [])

  /* Live spectrogram RAF loop — use only lower half of bins (musically active range) */
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      setLiveBars(null)
      return
    }
    setupAnalyser()
    const analyser = analyserRef.current
    if (!analyser) return
    const allBins = new Uint8Array(analyser.frequencyBinCount)
    const loop = () => {
      analyser.getByteFrequencyData(allBins)
      const relevant = allBins.slice(0, BAR_COUNT)
      setLiveBars(Array.from(relevant).map(v => 5 + (v / 255) * 85))
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [playing, setupAnalyser])

  /* Cleanup on unmount */
  useEffect(() => () => {
    audioRef.current?.pause()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    ctxRef.current?.close()
  }, [])

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return
    playing ? a.pause() : a.play()
  }
  const toggleMute = () => {
    const a = audioRef.current; if (!a) return
    a.muted = !a.muted; setMuted(a.muted)
  }

  const seekTo = useCallback((clientX) => {
    const a   = audioRef.current
    const bar = barRef.current
    if (!a || !bar) return
    const d = a.duration
    if (!d || !isFinite(d)) return
    const rect  = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    a.currentTime = ratio * d
    setCurrent(ratio * d)
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    seekTo(e.clientX)
    const onMove = (me) => seekTo(me.clientX)
    const onUp   = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [seekTo])

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60), sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const bars = liveBars ?? waveform ?? FALLBACK_BARS
  const pct  = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 min-h-0 px-10 py-10">
      <audio
        ref={audioRef}
        src={filesApi.previewUrl(item.id)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => { if (!isDragging.current) setCurrent(audioRef.current?.currentTime ?? 0) }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* Waveform / spectrogram */}
      <div className="flex items-end gap-0.5 h-14 w-full max-w-sm select-none">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-full"
            style={{
              height: `${h}%`,
              background: i / bars.length < pct / 100 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)',
              transition: liveBars ? 'none' : undefined,
            }}
          />
        ))}
      </div>

      {/* Seek bar */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <div
          ref={barRef}
          className="relative h-8 flex items-center cursor-pointer select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/15 pointer-events-none">
            <div className="h-full bg-white/65 transition-none pointer-events-none" style={{ width: `${pct}%` }} />
            {duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 pointer-events-none"
                style={{ left: `${pct}%` }}
              />
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-white/30">{fmt(current)}</span>
          <span className="font-mono text-[10px] text-white/30">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <button onClick={toggleMute} className="text-white/35 hover:text-white transition-colors duration-150">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          onClick={togglePlay}
          className="h-12 w-12 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors duration-150"
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <div className="w-4" />
      </div>
    </div>
  )
}

/* ─── Code / Markdown ─────────────────────────────────────────────────────── */
const MAX_LINES = 2000

function CodePreview({ item }) {
  const ext                    = getExt(item)
  const [code, setCode]        = useState(null)
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(filesApi.previewUrl(item.id), { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => { if (!cancelled) { setCode(text); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [item.id])

  const isMarkdown = ext === 'md'

  const { lang, tokenizedLines, mdLines } = useMemo(() => {
    if (!code) return { lang: 'text', tokenizedLines: [], mdLines: [] }
    if (isMarkdown) return { lang: 'md', tokenizedLines: [], mdLines: preprocessMarkdown(code) }
    const result = highlightCode(code, ext)
    const capped = result.lines.slice(0, MAX_LINES)
    return { lang: result.lang, tokenizedLines: capped, mdLines: [] }
  }, [code, ext, isMarkdown])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <span className="font-mono text-[11px] text-white/25 uppercase tracking-widest animate-pulse">Loading…</span>
    </div>
  )
  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <span className="font-mono text-[11px] text-white/25 uppercase tracking-widest">Failed to load.</span>
    </div>
  )
  if (!code) return null

  const totalLines = code.split('\n').length

  /* ── Markdown ── */
  if (isMarkdown) return (
    <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }} onWheel={e => e.stopPropagation()}>
      <div className="px-10 py-8 max-w-2xl mx-auto font-body text-sm">
        {mdLines.map((node, i) => <MdLine key={i} node={node} />)}
      </div>
    </div>
  )

  /* ── Code ── */
  return (
    <div className="flex-1 overflow-auto" style={{ minHeight: 0 }} onWheel={e => e.stopPropagation()}>
      <div className="py-2">
        {tokenizedLines.map((lineToks, i) => (
          <div key={i} className="flex hover:bg-white/[0.025] group" style={{ minHeight: 20 }}>
            <span
              className="select-none shrink-0 text-right font-mono text-[11px] text-white/20 border-r border-white/[0.06] group-hover:bg-white/[0.025]"
              style={{ width: 44, padding: '1px 10px 1px 0' }}
            >
              {i + 1}
            </span>
            <span className="font-mono text-[12px] leading-5 whitespace-pre" style={{ padding: '1px 24px 1px 16px' }}>
              {lineToks.map((tok, j) => (
                <span key={j} style={TOKEN_STYLE[tok.t]}>{tok.v}</span>
              ))}
            </span>
          </div>
        ))}
        {totalLines > MAX_LINES && (
          <div className="pl-14 py-3 font-mono text-[10px] text-white/20 uppercase tracking-widest">
            — {totalLines - MAX_LINES} more lines not shown —
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PDF ─────────────────────────────────────────────────────────────────── */
function PdfPreview({ item }) {
  return (
    <div className="flex-1" style={{ minHeight: 0 }}>
      <iframe src={filesApi.previewUrl(item.id)} className="w-full h-full border-none" title={item.name} />
    </div>
  )
}

/* ─── Default ─────────────────────────────────────────────────────────────── */
function DefaultPreview({ item, onDownload }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="h-20 w-20 flex items-center justify-center border border-white/10">
        <File size={38} className="text-white/15" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-label text-xs uppercase tracking-widest text-white/50 text-center px-6 break-all">{item.name}</span>
        <span className="font-mono text-[10px] text-white/25">{formatSize(item.size)}</span>
        {item.mimeType && <span className="font-mono text-[10px] text-white/15">{item.mimeType}</span>}
      </div>
      <button onClick={onDownload} className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-white border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors duration-150">
        <Download size={12} />Download
      </button>
    </div>
  )
}

/* ─── Main modal ──────────────────────────────────────────────────────────── */
export default function FilePreviewModal({ item, onClose, onDownload, onToggleFavorite }) {
  const overlayRef = useRef(null)
  const panelRef   = useRef(null)
  const closingRef = useRef(false)
  const kind       = getPreviewKind(item)

  /* Lock body scroll */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  /* Entrance animation */
  useEffect(() => {
    const o = overlayRef.current, p = panelRef.current
    if (!o || !p) return
    gsap.fromTo(o, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
    gsap.fromTo(p, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' })
  }, [])

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const o = overlayRef.current, p = panelRef.current
    if (o && p) gsap.to([p, o], { opacity: 0, duration: 0.15, ease: 'power2.in', onComplete: onClose })
    else onClose()
  }, [onClose])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [handleClose])

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/88 flex items-center justify-center p-4 md:p-8"
      onClick={(e) => { if (e.target === overlayRef.current) handleClose() }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={panelRef}
        className="bg-black border border-white/10 flex flex-col w-full max-w-5xl overflow-hidden"
        style={{ height: 'min(90vh, 820px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 h-12 flex items-center gap-3 px-4 border-b border-white/10">
          <span className="flex-1 font-label text-[11px] uppercase tracking-wider text-white/65 truncate min-w-0">
            {item.name}
          </span>
          <span className="font-mono text-[10px] text-white/20 shrink-0 hidden sm:block">
            {formatSize(item.size)}
          </span>
          <div className="flex items-center shrink-0 ml-1">
            <Tooltip content={item.favorited ? 'Unfavorite' : 'Favorite'} side="bottom">
              <button
                onClick={onToggleFavorite}
                className={['h-8 w-8 flex items-center justify-center transition-colors duration-150',
                  item.favorited ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/35 hover:text-yellow-400'].join(' ')}
              >
                {item.favorited ? <StarOff size={14} /> : <Star size={14} />}
              </button>
            </Tooltip>
            <Tooltip content="Download" side="bottom">
              <button onClick={onDownload} className="h-8 w-8 flex items-center justify-center text-white/35 hover:text-white transition-colors duration-150">
                <Download size={14} />
              </button>
            </Tooltip>
            <Tooltip content="Close" side="bottom">
              <button onClick={handleClose} className="h-8 w-8 flex items-center justify-center text-white/35 hover:text-white transition-colors duration-150">
                <X size={14} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {kind === 'image'  && <ImagePreview   item={item} />}
        {kind === 'video'  && <VideoPreview   item={item} />}
        {kind === 'audio'  && <AudioPreview   item={item} />}
        {kind === 'pdf'    && <PdfPreview     item={item} />}
        {kind === 'code'   && <CodePreview    item={item} />}
        {kind === 'other'  && <DefaultPreview item={item} onDownload={onDownload} />}
      </div>
    </div>,
    document.body
  )
}