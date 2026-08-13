import { Info } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Heading from '../components/Heading'
import Text from '../components/Text'
import Divider from '../components/Divider'
import Label from '../components/Label'
import Tooltip from '../components/Tooltip'
import { SkeletonButton } from '../components/Skeleton'
import MicrosoftSignInButton from '../components/app/MicrosoftSignInButton'
import SpinningLogo from '../components/SpinningLogo'

function Home() {
  const { status, error, signIn } = useAuth()

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md border border-white/10">
          <div className="flex flex-col items-center gap-4 px-10 py-14">
            <SpinningLogo size={88} />
            <Heading as="h1" font="heading" size="3xl" weight="medium" animate={false} className="text-white">
              Observer
            </Heading>
            <Text as="p" font="body" size="base" color="muted" animate={false} className="text-center">
              Real-time Minecraft username availability tracking.
            </Text>
          </div>

          <Divider />

          <div className="flex flex-col items-center gap-5 px-10 py-10">
            <div className="flex items-center gap-3">
              {status === 'loading' ? (
                <SkeletonButton width={236} height={48} />
              ) : (
                <MicrosoftSignInButton onClick={signIn} disabled={status === 'loading'} />
              )}

              <Tooltip
                side="top"
                content="Sign-in is required to check name availability — Mojang's API rejects unauthenticated requests."
              >
                <Info size={17} className="cursor-help text-white/40 transition-colors hover:text-white/70" />
              </Tooltip>
            </div>

            {status === 'error' && (
              <p className="text-center font-label text-xs text-error">{error}</p>
            )}

            {status === 'success' && (
              <Label variant="dot" color="accent" size="xs">
                Signed in
              </Label>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-3 text-center">
        <p className="font-label text-2xs text-white/40">
          Developed by{' '}
          <a
            href="https://github.com/whoisleoo"
            className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
          >
            whoisleoo
          </a>
        </p>
      </footer>
    </div>
  )
}

export default Home
