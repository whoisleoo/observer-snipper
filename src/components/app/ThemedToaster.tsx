import { Toaster } from 'sonner'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'

function ToastLoader() {
  return (
    <span className="flex h-4 w-4 items-center justify-center">
      <span className="toast-loader" />
    </span>
  )
}

function ThemedToaster() {
  const theme = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      gap={8}
      icons={{
        loading: <ToastLoader />,
        success: <CircleCheck size={16} color="var(--color-success)" />,
        error: <CircleX size={16} color="var(--color-error)" />,
        warning: <TriangleAlert size={16} color="var(--color-warning)" />,
        info: <Info size={16} color="var(--color-info)" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'bg-gray-950 border border-white/10 rounded-md px-4 py-3 flex items-start gap-3 w-[calc(100vw-2rem)] sm:w-80',
          title: 'text-sm font-mono text-white',
          description: 'text-xs font-body text-white/50 mt-0.5',
          icon: 'relative w-4 h-4 flex items-center justify-center mt-0.5 shrink-0',
          actionButton: 'flex items-center justify-center w-5 h-5 text-white/40 hover:text-white transition-colors duration-150 shrink-0',
          closeButton: 'text-white/30 hover:text-white transition-colors duration-150',
        },
      }}
    />
  )
}

export default ThemedToaster
