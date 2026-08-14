import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Dices,
  Hash,
  Info,
  Languages,
  LayoutGrid,
  ListFilter,
  Puzzle,
  Replace,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wand2,
} from 'lucide-react'
import Heading from '../Heading'
import Text from '../Text'
import Divider from '../Divider'
import Tooltip from '../Tooltip'
import Button from '../Button'
import Modal from '../Modal'
import NumberInput from '../NumberInput'
import Switch from '../Switch'
import Input from '../Input'
import Select from '../Select'
import { Accordion, AccordionItem } from '../Accordition'
import EstimateModal from './EstimateModal'
import { useRateLimits } from '../../hooks/useRateLimits'
import { ETA_WARN_THRESHOLD_SECONDS, estimateBulkEtaSeconds, formatEta } from '../../lib/eta'

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip side="top" content={text}>
      <Info size={13} className="cursor-help text-white/30 transition-colors hover:text-white/70" />
    </Tooltip>
  )
}

function FieldLabel({ icon, children, tip }: { icon?: ReactNode; children: ReactNode; tip?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-white/40">{icon}</span>}
      <span className="font-label text-xs uppercase tracking-widest text-white/40">{children}</span>
      {tip && <InfoTip text={tip} />}
    </div>
  )
}

/** Uma fonte de geracao: icone + nome + switch, com um numero opcional quando ligada. Cada uma isolada num quadro proprio pra nao virar uma pilha confusa. */
function SourceCard({
  icon,
  label,
  tip,
  enabled,
  onToggle,
  children,
}: {
  icon: ReactNode
  label: string
  tip: string
  enabled: boolean
  onToggle: (value: boolean) => void
  children?: ReactNode
}) {
  return (
    <div className="border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <FieldLabel icon={icon} tip={tip}>
          {label}
        </FieldLabel>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && children && <div className="mt-3">{children}</div>}
    </div>
  )
}

interface SearchConfigPanelProps {
  busy: boolean
  errorMessage: string | null
  onSearch: (options: SearchOptions) => void
  candidateCount: number
  onClearDatabase: () => Promise<void>
}

function SearchConfigPanel({ busy, errorMessage, onSearch, candidateCount, onClearDatabase }: SearchConfigPanelProps) {
  const [length, setLength] = useState(4)
  const [wordEn, setWordEn] = useState(true)
  const [wordPt, setWordPt] = useState(false)
  const [useMarkov, setUseMarkov] = useState(true)
  const [markovCount, setMarkovCount] = useState(200)
  const [useDeterministic, setUseDeterministic] = useState(true)
  const [deterministicCount, setDeterministicCount] = useState(200)
  const [useLeet, setUseLeet] = useState(false)
  const [leetMax, setLeetMax] = useState(5)
  const [pattern, setPattern] = useState('')
  const [useRandom, setUseRandom] = useState(false)
  const [randomCount, setRandomCount] = useState(100)
  const [badwordsMode, setBadwordsMode] = useState<'smart' | 'strict' | 'off'>('smart')
  const [clean, setClean] = useState(true)
  const [pronounceable, setPronounceable] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingOptions, setPendingOptions] = useState<SearchOptions | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const rateLimits = useRateLimits()

  // So pra warning ao vivo enquanto edita, ANTES de clicar Search — soma
  // so as fontes com contagem explicita, ja que dicionario/leet/pattern
  // nao tem tamanho previsivel sem carregar a wordlist (custaria caro
  // rodar isso a cada tecla digitada). O numero REAL, incluindo
  // dicionario/pattern, vem do preview() no momento de confirmar.
  const quickEstimate = useMemo(
    () => (useMarkov ? markovCount : 0) + (useDeterministic ? deterministicCount : 0) + (useRandom ? randomCount : 0),
    [useMarkov, markovCount, useDeterministic, deterministicCount, useRandom, randomCount],
  )

  const quickEtaSeconds = useMemo(
    () => (rateLimits ? estimateBulkEtaSeconds(quickEstimate, rateLimits.bulk) : 0),
    [quickEstimate, rateLimits],
  )

  const showEtaWarning = rateLimits !== null && quickEtaSeconds > ETA_WARN_THRESHOLD_SECONDS

  const realTotal = previewResult?.total ?? 0
  const etaSeconds = useMemo(
    () => (rateLimits ? estimateBulkEtaSeconds(realTotal, rateLimits.bulk) : 0),
    [realTotal, rateLimits],
  )

  const buildOptions = (): SearchOptions => {
    const langs = [wordEn && 'en', wordPt && 'pt'].filter(Boolean) as Array<'en' | 'pt'>
    const effectiveLangs: Array<'en' | 'pt'> = langs.length ? langs : ['en']

    const options: SearchOptions = { lengths: [length], clean, pronounceable }
    if (langs.length) options.wordLangs = langs
    if (badwordsMode !== 'off') options.badwords = { langs: effectiveLangs, mode: badwordsMode }
    if (useLeet) options.leetMaxPerWord = leetMax
    if (pattern.trim()) {
      options.patterns = pattern
        .split(',')
        .map((p) => ({ pattern: p.trim() }))
        .filter((p) => p.pattern)
    }
    if (useMarkov) options.markov = { count: markovCount, langs: effectiveLangs }
    if (useDeterministic) options.deterministic = deterministicCount
    if (useRandom) options.random = randomCount

    return options
  }

  const handleSearch = async () => {
    const options = buildOptions()
    setPreviewing(true)
    try {
      const preview = await window.electron.nick.preview(options)
      setPendingOptions(options)
      setPreviewResult(preview)
      setConfirmOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      toast.error('Could not estimate candidates', { description: message })
    } finally {
      setPreviewing(false)
    }
  }

  const handleConfirm = () => {
    if (!pendingOptions) return
    setConfirmOpen(false)
    onSearch(pendingOptions)
  }

  const handleClearConfirm = async () => {
    setClearing(true)
    try {
      await onClearDatabase()
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }

  const summaryRows = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [{ label: 'Length', value: `${length} characters` }]

    const langs = [wordEn && 'English', wordPt && 'Portuguese'].filter(Boolean) as string[]
    if (langs.length) rows.push({ label: 'Dictionaries', value: langs.join(', ') })

    // Numeros reais do preview() — inclui Dictionary/Pattern, que antes
    // nao apareciam em lugar nenhum antes de a busca ja ter rodado.
    const bySource = previewResult?.bySource ?? {}
    const sources: string[] = []
    if (bySource.word) sources.push(`Dictionary (${bySource.word.toLocaleString()})`)
    if (bySource.markov) sources.push(`Markov (${bySource.markov.toLocaleString()})`)
    if (bySource.deterministic) sources.push(`Deterministic (${bySource.deterministic.toLocaleString()})`)
    if (bySource.leet) sources.push(`Leetspeak (${bySource.leet.toLocaleString()})`)
    if (bySource.random) sources.push(`Random (${bySource.random.toLocaleString()})`)
    if (bySource.pattern) sources.push(`Pattern (${bySource.pattern.toLocaleString()})`)
    rows.push({ label: 'Sources', value: sources.length ? sources.join(', ') : 'None' })

    rows.push({
      label: 'Filters',
      value: [
        badwordsMode !== 'off' ? `Bad words: ${badwordsMode}` : null,
        clean ? 'Clean only' : null,
        pronounceable ? 'Pronounceable only' : null,
      ]
        .filter(Boolean)
        .join(', ') || 'None',
    })

    return rows
  }, [length, wordEn, wordPt, previewResult, badwordsMode, clean, pronounceable])

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-white/10 px-6 py-6">
      <Heading as="h2" font="heading" size="lg" weight="medium" animate={false} className="text-white">
        Search
      </Heading>
      <Text as="p" font="body" size="sm" color="muted" animate={false} className="mt-1 mb-6">
        Generate candidate usernames and check availability.
      </Text>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <FieldLabel icon={<Hash size={13} />}>Name length</FieldLabel>
          <NumberInput value={length} onChange={setLength} min={3} max={16} />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel icon={<Languages size={13} />}>Dictionaries</FieldLabel>
          <div className="flex items-center gap-5">
            <Switch label="English" checked={wordEn} onCheckedChange={setWordEn} />
            <Switch label="Portuguese" checked={wordPt} onCheckedChange={setWordPt} />
          </div>
        </div>
      </div>

      <Divider className="my-6" />

      <Accordion>
        <AccordionItem
          value="sources"
          trigger={
            <span className="inline-flex items-center gap-2 font-label text-sm uppercase tracking-widest">
              <Wand2 size={14} />
              Generation sources
            </span>
          }
        >
          <div className="flex flex-col gap-3">
            <SourceCard
              icon={<Sparkles size={13} />}
              label="Markov"
              tip="Generates invented names that sound like real words, learned from the dictionaries above. The most reliable general-purpose source."
              enabled={useMarkov}
              onToggle={setUseMarkov}
            >
              <NumberInput label="Count" value={markovCount} onChange={setMarkovCount} min={0} max={5000} step={50} />
            </SourceCard>

            <SourceCard
              icon={<Puzzle size={13} />}
              label="Deterministic"
              tip="Builds names directly from valid English syllable structure. Every result is guaranteed pronounceable."
              enabled={useDeterministic}
              onToggle={setUseDeterministic}
            >
              <NumberInput
                label="Count"
                value={deterministicCount}
                onChange={setDeterministicCount}
                min={0}
                max={5000}
                step={50}
              />
            </SourceCard>

            <SourceCard
              icon={<Replace size={13} />}
              label="Leetspeak"
              tip="Letter-substitution variants of dictionary words, e.g. cool → c00l."
              enabled={useLeet}
              onToggle={setUseLeet}
            >
              <NumberInput label="Max variants per word" value={leetMax} onChange={setLeetMax} min={1} max={20} />
            </SourceCard>

            <div className="border border-white/10 p-3">
              <FieldLabel
                icon={<LayoutGrid size={13} />}
                tip="Fixed shape template: c=consonant, v=vowel, l=letter, d=digit, x=any. One name per matching combination. Comma-separate multiple patterns."
              >
                Pattern
              </FieldLabel>
              <Input
                className="mt-3"
                placeholder="e.g. cvcv, ccvc"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
              />
            </div>

            <SourceCard
              icon={<Dices size={13} />}
              label="Random"
              tip="Pure random combinations of letters, digits and underscore. Lowest quality, highest volume."
              enabled={useRandom}
              onToggle={setUseRandom}
            >
              <NumberInput label="Count" value={randomCount} onChange={setRandomCount} min={0} max={5000} step={50} />
            </SourceCard>
          </div>
        </AccordionItem>

        <AccordionItem
          value="filters"
          trigger={
            <span className="inline-flex items-center gap-2 font-label text-sm uppercase tracking-widest">
              <ListFilter size={14} />
              Filters
            </span>
          }
        >
          <div className="flex flex-col gap-4">
            <Select
              label="Bad words filter"
              options={[
                { value: 'smart', label: 'Smart (recommended)' },
                { value: 'strict', label: 'Strict' },
                { value: 'off', label: 'Off' },
              ]}
              value={badwordsMode}
              onValueChange={(v: string) => setBadwordsMode(v as 'smart' | 'strict' | 'off')}
            />

            <div className="flex items-center justify-between border border-white/10 p-3">
              <FieldLabel tip="Only letters, no digits or underscore.">Clean names only</FieldLabel>
              <Switch checked={clean} onCheckedChange={setClean} />
            </div>

            <div className="flex items-center justify-between border border-white/10 p-3">
              <FieldLabel tip="Discard names that don't sound pronounceable in English, regardless of source.">
                Pronounceable only
              </FieldLabel>
              <Switch checked={pronounceable} onCheckedChange={setPronounceable} />
            </div>
          </div>
        </AccordionItem>
      </Accordion>

      {showEtaWarning && (
        <div className="mt-4 flex items-start gap-2 text-warning">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          <p className="font-body text-xs">
            That's a lot of candidates — checking availability may take up to{' '}
            <strong>{formatEta(quickEtaSeconds)}</strong>. Dictionaries and Pattern aren't counted here; the real
            total shows up when you hit Search.
          </p>
        </div>
      )}

      <Button
        variant="solid"
        size="md"
        icon={<Search size={14} />}
        className="mt-6 w-full"
        onClick={handleSearch}
        loading={busy || previewing}
      >
        Search
      </Button>

      {errorMessage && <p className="mt-3 font-label text-xs text-error">{errorMessage}</p>}

      <Button
        variant="ghost"
        state="error"
        size="sm"
        icon={<Trash2 size={14} />}
        className="mt-3 w-full"
        onClick={() => setClearOpen(true)}
        disabled={busy || candidateCount === 0}
      >
        Clear database
      </Button>

      <EstimateModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm search"
        description="Review your filters before Observer starts checking availability."
        rows={summaryRows}
        candidateCount={realTotal}
        candidateCountLabel="Estimated candidates"
        etaSeconds={etaSeconds}
        onConfirm={handleConfirm}
        confirmLabel="Start search"
        loading={busy}
      />

      <Modal
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear database"
        description="This permanently deletes every candidate stored locally, including search and verification progress. This cannot be undone."
        size="sm"
        onConfirm={handleClearConfirm}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" state="error" size="sm" onClick={handleClearConfirm} loading={clearing}>
              Delete all
            </Button>
          </>
        }
      >
        <div className="flex items-center justify-between border border-white/10 px-3 py-2.5">
          <span className="font-label text-xs uppercase tracking-widest text-white/40">Candidates to delete</span>
          <span className="font-mono text-sm text-white">{candidateCount.toLocaleString()}</span>
        </div>
      </Modal>
    </aside>
  )
}

export default SearchConfigPanel
