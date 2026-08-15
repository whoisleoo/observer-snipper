import { useEffect, useRef } from 'react';
import { Render } from 'skin3d';

/**
 * Skin3D — visualizador 3D de skin/cape.
 *
 * <Skin3D skin="/skins/steve.png" cape="/capes/minecon.png" width={600} height={800} />
 */
export default function Skin3D({
  skin,
  cape,
  width = 600,
  height = 800,
  className,
  style,
  onReady,
  ...canvasProps
}) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  // 1. Cria o viewer uma única vez (e destrói ao desmontar)
  useEffect(() => {
    const viewer = new Render({
      canvas: canvasRef.current,
      width,
      height,
    });

    viewerRef.current = viewer;
    onReady?.(viewer);

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Redimensiona sem recriar o viewer
  useEffect(() => {
    viewerRef.current?.setSize(width, height);
  }, [width, height]);

  // 3. Troca a skin quando a prop muda
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelado = false;

    if (skin) {
      Promise.resolve(viewer.loadSkin(skin)).catch((err) => {
        if (!cancelado) console.error('Falha ao carregar a skin:', err);
      });
    } else {
      viewer.loadSkin(null);
    }

    return () => {
      cancelado = true;
    };
  }, [skin]);

  // 4. Troca a cape quando a prop muda
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelado = false;

    if (cape) {
      Promise.resolve(viewer.loadCape(cape)).catch((err) => {
        if (!cancelado) console.error('Falha ao carregar a cape:', err);
      });
    } else {
      viewer.loadCape(null);
    }

    return () => {
      cancelado = true;
    };
  }, [cape]);

  return <canvas ref={canvasRef} className={className} style={style} {...canvasProps} />;
}