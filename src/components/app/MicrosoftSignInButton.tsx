interface MicrosoftSignInButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  /** Ultimo usuario conhecido — personaliza o texto pra "Sign in as {username}" em vez do generico. */
  username?: string | null
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

// Hover simples via CSS puro (opacity/scale) em vez de troca de cor via
// framer-motion — o slide de overlay anterior dependia de propagacao de
// variant por 3 niveis de motion.span aninhados e nao dava pra garantir
// visualmente em ambos os temas. Opacity sempre escurece de forma visivel,
// nao importa a cor de base nem o tema.
export default function MicrosoftSignInButton({
  onClick,
  loading = false,
  disabled = false,
  username = null,
}: MicrosoftSignInButtonProps) {
  const label = loading ? 'Signing in…' : username ? `Sign in as ${username}` : 'Sign in with Microsoft'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex h-12 items-center justify-center gap-3 rounded-none border border-white bg-white px-6 font-label text-base text-black select-none transition-all duration-150 hover:opacity-80 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
      ) : (
        <MicrosoftLogo />
      )}
      <span>{label}</span>
    </button>
  )
}
