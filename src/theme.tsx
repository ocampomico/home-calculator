import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function loadTheme(key: string): Theme {
  try {
    return localStorage.getItem(key) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeSwitch({ storageKey }: { storageKey: string }) {
  const [theme, setTheme] = useState<Theme>(() => loadTheme(storageKey))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(storageKey, theme)
    } catch {
      // Storage unavailable: the choice lasts for this session only.
    }
  }, [theme, storageKey])

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-muted hover:text-ink"
    >
      <span aria-hidden="true" className={`relative h-5 w-9 rounded-full border transition-colors ${dark ? 'border-ink bg-ink' : 'border-field bg-card'}`}>
        <span className={`absolute top-0.5 size-3.5 rounded-full transition-all ${dark ? 'left-[18px] bg-paper' : 'left-0.5 bg-field'}`} />
      </span>
      <span className="hidden sm:inline">Dark mode</span>
    </button>
  )
}
