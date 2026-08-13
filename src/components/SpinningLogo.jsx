import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useCursorDispatch } from '../hooks/useCursor.js'

const MODEL_URL = '/3d/observer.glb'

const AUTO_SPEED       = 0.90
const DRAG_SENSITIVITY = 0.012
const DAMPING          = 0.92
const RESUME_DELAY     = 1200
const RESUME_RAMP      = 900

export default function SpinningLogo({ size = 96, className = '' }) {
  const mountRef = useRef(null)
  const setCursor = useCursorDispatch()

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let cancelled = false
    let width  = mount.clientWidth  || size
    let height = mount.clientHeight || size

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100)
    camera.position.set(0, 0, 6)

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(3, 4, 5)
    scene.add(keyLight)

    const rig = new THREE.Group()
    scene.add(rig)

    const loader = new GLTFLoader()
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (cancelled) return
        const model = gltf.scene

        const box    = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const sizeVec = box.getSize(new THREE.Vector3())
        const maxAxis = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1

        model.position.sub(center)
        model.rotation.y = Math.PI / 2
        rig.add(model)
        rig.scale.setScalar(2.4 / maxAxis)
      },
      undefined,
      (error) => {
        console.error('Falha ao carregar observer.glb', error)
      }
    )

    let isDragging   = false
    let lastX        = 0
    let velocity      = 0
    let idleFor       = Infinity
    let resumeElapsed = 0

    const onPointerDown = (e) => {
      isDragging = true
      lastX = e.clientX
      velocity = 0
      mount.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!isDragging) return
      const deltaX = e.clientX - lastX
      lastX = e.clientX
      const delta = deltaX * DRAG_SENSITIVITY
      rig.rotation.y += delta
      velocity = delta
    }

    const stopDragging = (e) => {
      if (!isDragging) return
      isDragging = false
      idleFor = 0
      resumeElapsed = 0
      try { mount.releasePointerCapture(e.pointerId) } catch { /* já liberado */ }
    }

    mount.addEventListener('pointerdown', onPointerDown)
    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerup', stopDragging)
    mount.addEventListener('pointercancel', stopDragging)
    mount.addEventListener('pointerenter', () => setCursor('hover'))
    mount.addEventListener('pointerleave', () => setCursor('default'))

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      width  = entry.contentRect.width  || width
      height = entry.contentRect.height || height
      if (width <= 0 || height <= 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(mount)

    let isVisible = true
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting },
      { threshold: 0 }
    )
    intersectionObserver.observe(mount)

    let rafId
    let lastTime = performance.now()

    const tick = (now) => {
      rafId = requestAnimationFrame(tick)
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      if (!isVisible) return

      if (isDragging) {
      } else {
        if (Math.abs(velocity) > 0.0001) {
          rig.rotation.y += velocity
          velocity *= DAMPING
        }

        idleFor += dt * 1000
        if (idleFor >= RESUME_DELAY) {
          resumeElapsed += dt * 1000
          const ramp = Math.min(resumeElapsed / RESUME_RAMP, 1)
          rig.rotation.y += AUTO_SPEED * dt * ramp
        }
      }

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      mount.removeEventListener('pointerdown', onPointerDown)
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerup', stopDragging)
      mount.removeEventListener('pointercancel', stopDragging)

      rig.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          materials.forEach((m) => m.dispose())
        }
      })
      envTexture.dispose()
      pmremGenerator.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [size, setCursor])

  return (
    <div
      ref={mountRef}
      className={['touch-none select-none cursor-grab active:cursor-grabbing', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
    />
  )
}