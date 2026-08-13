import { forwardRef, useRef, useImperativeHandle, useEffect } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'

const FloatingTrashZone = forwardRef(function FloatingTrashZone({ isDragging }, ref) {
  const wrapRef  = useRef(null)
  const lidRef   = useRef(null)
  const iconRef  = useRef(null)

  useImperativeHandle(ref, () => ({
    el:    () => wrapRef.current,
    open:  () => {
      if (!lidRef.current) return
      gsap.to(lidRef.current, {
        rotate:    -48,
        svgOrigin: '3 7',
        duration:  0.3,
        ease:      'back.out(1.8)',
      })
      gsap.to(iconRef.current, {
        color:    'rgb(239,68,68)',
        duration: 0.2,
        ease:     'power2.out',
      })
      gsap.to(wrapRef.current, {
        scale:    1.15,
        duration: 0.28,
        ease:     'back.out(1.8)',
      })
    },
    close: () => {
      if (!lidRef.current) return
      gsap.to(lidRef.current, {
        rotate:   0,
        duration: 0.22,
        ease:     'power2.in',
      })
      gsap.to(iconRef.current, {
        color:    'rgba(255,255,255,0.55)',
        duration: 0.18,
        ease:     'power2.in',
      })
      gsap.to(wrapRef.current, {
        scale:    1,
        duration: 0.2,
        ease:     'power2.in',
      })
    },
  }))

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    gsap.killTweensOf(el)
    if (isDragging) {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.55, y: 18 },
        { opacity: 1, scale: 1,    y: 0, duration: 0.32, ease: 'back.out(1.6)' }
      )
    } else {
      gsap.to(el, {
        opacity: 0, scale: 0.55, y: 18,
        duration: 0.2, ease: 'power2.in',
      })
    }
  }, [isDragging])

  return createPortal(
    <div
      ref={wrapRef}
      style={{
        position:      'fixed',
        bottom:        28,
        right:         28,
        zIndex:        9998,
        opacity:       0,
        pointerEvents: 'none',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           8,
      }}
    >
      <div
        style={{
          width:          56,
          height:         56,
          borderRadius:   '50%',
          border:         '1.5px solid rgba(255,255,255,0.15)',
          background:     'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(10px)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        {/*
          SVG trash icon with clearly separated lid and body.
          Lid group pivots at svgOrigin '3 7' (left edge of the lid bar).
          Body starts at y=9 (below the lid bar y=6..8) so there's no overlap.
        */}
        <svg
          ref={iconRef}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'rgba(255,255,255,0.55)', overflow: 'visible' }}
        >
          {/* LID — pivots around left hinge at (3, 7) */}
          <g ref={lidRef}>
            {/* handle */}
            <path d="M10 4 L10 3 Q10 2 12 2 Q14 2 14 3 L14 4" />
            {/* lid bar — from x=3 to x=21 at y=6..8 */}
            <path d="M3 7 L21 7" />
          </g>

          {/* BODY — starts at y=7, well below the lid bar pivot */}
          <path d="M5 7 L6 20 Q6 22 8 22 L16 22 Q18 22 18 20 L19 7" />
          <line x1="10" y1="11" x2="10" y2="18" />
          <line x1="14" y1="11" x2="14" y2="18" />
        </svg>
      </div>

      <span
        style={{
          fontFamily:    'monospace',
          fontSize:      9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.28)',
          userSelect:    'none',
          whiteSpace:    'nowrap',
        }}
      >
        Drop to delete
      </span>
    </div>,
    document.body
  )
})

export default FloatingTrashZone