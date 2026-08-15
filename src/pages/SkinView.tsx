import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Footprints, RotateCcw, Rotate3d, Upload, UserRound } from 'lucide-react'
import Button from '../components/Button'
import Heading from '../components/Heading'
import Text from '../components/Text'
import Input from '../components/Input'
import Switch from '../components/Switch'
import Select from '../components/Select'
import { RadioGroup, RadioItem } from '../components/Radio'
import SkinViewer from '../components/SkinViewer'
import { validateSkinImage } from '../lib/skinFile'

interface SkinViewProps {
  username: string
  onBack: () => void
}

const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'Transparent', type: 'none' as const },
  { value: '#0d0d0d', label: 'Dark', type: 'color' as const },
  { value: '#282828', label: 'Gray', type: 'color' as const },
  { value: '#f5f5f5', label: 'White', type: 'color' as const },
  { value: './alpha.jpg', label: 'Alpha', type: 'image' as const },
  { value: './bedwars.jpg', label: 'Bedwars', type: 'image' as const },
  { value: './hypixel_lobby.webp', label: 'Hypixel Lobby', type: 'image' as const },
]

function FieldLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-white/60">{icon}</span>}
      <span className="font-label text-xs uppercase tracking-widest text-white/60">{children}</span>
    </div>
  )
}

function SkinView({ username, onBack }: SkinViewProps) {
  const [nick, setNick] = useState(username)
  const [skinUrl, setSkinUrl] = useState<string | null>(null)
  const [importedSkinUrl, setImportedSkinUrl] = useState<string | null>(null)
  const [model, setModel] = useState<'auto-detect' | 'default' | 'slim'>('auto-detect')
  const [autoRotate, setAutoRotate] = useState(true)
  const [walking, setWalking] = useState(true)
  const [background, setBackground] = useState('transparent')
  const viewerRef = useRef<{ resetView: () => void }>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // A skin e sempre a da conta logada (via token), buscada uma unica vez —
  // trocar o nick so muda a nametag acima da cabeca, nunca a textura.
  // Se o token falhar por qualquer motivo, cai pra mesma API por nick que a
  // cabeca isometrica do TopBar ja usa.
  useEffect(() => {
    let cancelled = false
    window.electron.auth
      .getSkinUrl()
      .then((url) => url ?? `https://mc-heads.net/skin/${username}`)
      .catch(() => `https://mc-heads.net/skin/${username}`)
      .then((url) => {
        if (!cancelled) setSkinUrl(url)
      })
    return () => {
      cancelled = true
    }
  }, [username])

  // object URL de uma skin importada localmente — some ao trocar por outra
  // ou ao desmontar, senao vaza memoria.
  useEffect(() => {
    return () => {
      if (importedSkinUrl) URL.revokeObjectURL(importedSkinUrl)
    }
  }, [importedSkinUrl])

  const handleImportFile = async (file: File) => {
    const result = await validateSkinImage(file)
    if (!result.valid) {
      toast.error('Invalid skin', { description: result.reason })
      return
    }

    if (importedSkinUrl) URL.revokeObjectURL(importedSkinUrl)
    setImportedSkinUrl(URL.createObjectURL(file))
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-96 shrink-0 overflow-y-auto border-r border-white/50 px-6 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
            Voltar
          </Button>
        </div>

        <Heading as="h2" font="heading" size="lg" weight="medium" animate={false} className="text-white">
        Try a nickname
        </Heading>
        <Text as="p" font="body" size="sm" color="muted" animate={false} className="mt-1 mb-6">
        See how a nickname looks in 3D before you pick one.
        </Text>

        <div className="flex flex-col gap-5">
          <Input
            label="Nickname"
            icon={<UserRound size={14} />}
            placeholder="Enter a nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={16}
          />

          <Select
            label="Background"
            options={BACKGROUND_OPTIONS}
            value={background}
            onValueChange={setBackground}
          />

          <div className="flex flex-col gap-2">
            <FieldLabel>Model</FieldLabel>
            <RadioGroup value={model} onValueChange={(v: string) => setModel(v as typeof model)}>
              <RadioItem value="default" label="Classic" />
              <RadioItem value="slim" label="Slim" />
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) handleImportFile(file)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              icon={<Upload size={14} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import skin
            </Button>
            {importedSkinUrl && (
              <button
                type="button"
                onClick={() => setImportedSkinUrl(null)}
                className="font-label text-xs text-white/40 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
              >
                Use my account's skin instead
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-3">
            <FieldLabel icon={<Rotate3d size={13} />}>Auto Rotate</FieldLabel>
            <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
          </div>

          <div className="flex items-center justify-between p-3">
            <FieldLabel icon={<Footprints size={13} />}>Walking Animation</FieldLabel>
            <Switch checked={walking} onCheckedChange={setWalking} />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => viewerRef.current?.resetView()}
          >
            Reset camera
          </Button>
        </div>
      </aside>

      <div className="min-w-0 min-h-0 flex-1 p-6">
        <SkinViewer
          ref={viewerRef}
          skinUrl={importedSkinUrl ?? skinUrl}
          model={model}
          nameTag={nick.trim() || null}
          autoRotate={autoRotate}
          walking={walking}
          background={BACKGROUND_OPTIONS.find((o) => o.value === background) ?? BACKGROUND_OPTIONS[0]}
          className="h-full w-full"
        />
      </div>
    </div>
  )
}

export default SkinView
