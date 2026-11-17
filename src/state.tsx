import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { HomeInputs, RentInputs } from './engine/mortgage'

export const DEFAULT_HOME: HomeInputs = {
  price: 900_000,
  downPct: 0.2,
  rate: 0.065,
  termYears: 30,
  propertyTaxRate: 0.012,
  prop13: true,
  insurancePerYear: 2_400,
  hoaPerMonth: 0,
  pmiRate: 0.005,
  extraPerMonth: 0,
  closingPct: 0.02,
}

export const DEFAULT_RENT: RentInputs = {
  rentPerMonth: 3_800,
  rentersInsurancePerMonth: 20,
  rentGrowth: 0.03,
  appreciation: 0.035,
  investReturn: 0.07,
  maintenanceRate: 0.01,
  costGrowth: 0.03,
  sellingPct: 0.06,
  years: 10,
}

type Saved = { home: HomeInputs; rent: RentInputs }
const KEY = 'home-calculator:inputs'

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<Saved>
      return { home: { ...DEFAULT_HOME, ...s.home }, rent: { ...DEFAULT_RENT, ...s.rent } }
    }
  } catch {
    // Unreadable or blocked storage: start from defaults.
  }
  return { home: DEFAULT_HOME, rent: DEFAULT_RENT }
}

type Store = Saved & {
  setHome: (patch: Partial<HomeInputs>) => void
  setRent: (patch: Partial<RentInputs>) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      // Storage unavailable: inputs last for this session only.
    }
  }, [saved])

  const store: Store = {
    ...saved,
    setHome: (patch) => setSaved((s) => ({ ...s, home: { ...s.home, ...patch } })),
    setRent: (patch) => setSaved((s) => ({ ...s, rent: { ...s.rent, ...patch } })),
    reset: () => setSaved({ home: DEFAULT_HOME, rent: DEFAULT_RENT }),
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
