import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './state'
import { ThemeSwitch } from './theme'
import { Disclaimer } from './ui'
import { Mortgage } from './views/Mortgage'
import { RentVsBuy } from './views/RentVsBuy'

const TABS = [
  { id: 'mortgage', label: 'Mortgage', blurb: 'Your monthly payment, when PMI ends, and what extra payments save.' },
  { id: 'rentvsbuy', label: 'Rent vs Buy', blurb: 'Which leaves you with more, and how long you need to stay for buying to win.' },
] as const

type TabId = (typeof TABS)[number]['id']

const tabFromHash = (): TabId => TABS.find((t) => `#${t.id}` === window.location.hash)?.id ?? 'mortgage'

function ResetInputs() {
  const { reset } = useStore()
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="min-h-10 rounded-lg px-3 text-left text-sm text-muted hover:text-ink">
        Reset inputs
      </button>
    )
  }
  return (
    <div role="alertdialog" aria-label="Reset inputs" className="absolute inset-x-4 top-14 z-30 rounded-lg border border-line bg-card p-3 text-sm shadow-sm lg:static lg:mx-0">
      <p className="font-medium">Reset to the defaults?</p>
      <p className="mt-1 text-[13px] text-muted">Every number you entered is replaced with the starting example.</p>
      <div className="mt-3 flex flex-wrap gap-2 whitespace-nowrap">
        <button
          type="button"
          className="min-h-9 rounded-lg border border-warn px-3 font-medium text-warn"
          onClick={() => {
            reset()
            setConfirming(false)
          }}
        >
          Yes, reset
        </button>
        <button type="button" autoFocus className="min-h-9 rounded-lg border border-line px-3" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<TabId>(tabFromHash)
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]

  useEffect(() => {
    const onHash = () => {
      setTab(tabFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const goTo = (id: TabId) => {
    window.location.hash = id
    setTab(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <StoreProvider>
      <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10 lg:px-8">
        <aside className="relative flex items-center justify-between gap-1 py-4 lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:py-8">
          <p className="mr-auto text-[15px] font-semibold tracking-tight lg:mr-0 lg:px-3">Home Calculator</p>
          <nav
            aria-label="Sections"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:pb-0"
          >
            <ul className="flex lg:flex-col lg:gap-0.5">
              {TABS.map((t) => {
                const on = t.id === tab
                return (
                  <li key={t.id} className="min-w-0 flex-1 lg:flex-none">
                    <a
                      href={`#${t.id}`}
                      aria-current={on ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault()
                        goTo(t.id)
                      }}
                      className={`flex min-h-14 items-center justify-center border-t-2 text-xs lg:min-h-0 lg:justify-start lg:rounded-lg lg:border-0 lg:px-3 lg:py-2 lg:text-sm ${
                        on ? 'border-ink font-semibold text-ink lg:bg-accent-soft lg:font-medium' : 'border-transparent text-muted hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="lg:mt-auto lg:flex lg:flex-col">
            <ResetInputs />
          </div>
          <ThemeSwitch storageKey="home-calculator:theme" />
        </aside>

        <div className="min-w-0 pt-2 pb-28 lg:py-8">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted">{active.blurb}</p>
          </header>

          <main className="max-w-4xl">
            {tab === 'mortgage' && <Mortgage />}
            {tab === 'rentvsbuy' && <RentVsBuy goToMortgage={() => goTo('mortgage')} />}
          </main>

          <footer className="mt-8 max-w-4xl space-y-1">
            <Disclaimer />
            <p className="text-xs text-muted">Your inputs are saved in this browser only. Nothing is sent to a server.</p>
          </footer>
        </div>
      </div>
    </StoreProvider>
  )
}
