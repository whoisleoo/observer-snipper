import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { NameTagObject, Render, WalkingAnimation } from 'skin3d'

const SkinViewer = forwardRef(function SkinViewer(
  {
    skinUrl,
    nameTag,
    autoRotate = true,
    walking = true,
    background = { type: 'none' },
    model = 'auto-detect',
    className = '',
  },
  ref,
) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const renderRef = useRef(null)
  const [error, setError] = useState(null)

  // Render is created once and kept alive across re-renders — recreating
  // the WebGL context on every keystroke (e.g. while typing the nickname)
  // would flicker and is expensive. Every prop below reacts independently
  // instead of tearing the whole thing down.
  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return undefined

    const render = new Render({
      canvas,
      width: wrapper.clientWidth,
      height: wrapper.clientHeight,
      zoom: 0.7,
    })
    renderRef.current = render

    // Observing the wrapper (not the canvas) is what its size should
    // actually follow. Watching the canvas itself risks a feedback loop,
    // since render.setSize() below writes to the canvas's own width/height
    // attributes — the very thing being observed.
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width <= 0 || height <= 0) return
      render.setSize(width, height)
    })
    resizeObserver.observe(wrapper)

    return () => {
      resizeObserver.disconnect()
      render.dispose()
      renderRef.current = null
    }
  }, [])

  useEffect(() => {
    const render = renderRef.current
    if (!render || !skinUrl) return

    setError(null)
    render.loadSkin(skinUrl, { model }).catch((err) => setError(err))
  }, [skinUrl, model])

  useEffect(() => {
    const render = renderRef.current
    if (!render) return
    // Font matches the app's own Monocraft (Minecraft-styled) typeface —
    // skin3d's default is "48px Minecraft", a font this app never loads.
    render.nameTag = nameTag ? new NameTagObject(nameTag, { font: '48px Monocraft' }) : null
  }, [nameTag])

  useEffect(() => {
    const render = renderRef.current
    if (!render) return

    if (background.type === 'image') {
      render.loadBackground(background.value).catch((err) => setError(err))
    } else {
      render.background = background.type === 'color' ? background.value : null
    }
  }, [background])

  useEffect(() => {
    const render = renderRef.current
    if (!render) return
    render.autoRotate = autoRotate
    render.autoRotateSpeed = 0.6
  }, [autoRotate])

  useEffect(() => {
    const render = renderRef.current
    if (!render) return
    if (walking) {
      const animation = new WalkingAnimation()
      animation.speed = 0.6
      render.animation = animation
    } else {
      render.animation = null
    }
  }, [walking])

  useImperativeHandle(ref, () => ({
    resetView: () => renderRef.current?.resetCameraPose(),
  }))

  return (
    <div ref={wrapperRef} className={['relative min-w-0 min-h-0 overflow-hidden', className].filter(Boolean).join(' ')}>
      <canvas ref={canvasRef} className="block h-full w-full cursor-grab active:cursor-grabbing" />
      {error && (
        <p className="absolute inset-0 flex items-center justify-center font-mono text-xs text-white/40">
          Falha ao carregar a skin
        </p>
      )}
    </div>
  )
})

export default SkinViewer
