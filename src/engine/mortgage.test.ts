import { describe, expect, it } from 'vitest'
import { amortize, byYear, firstMonth, monthlyPI, PMI_DROP_LTV, rentVsBuy, type HomeInputs, type RentInputs } from './mortgage'

const home: HomeInputs = {
  price: 400_000,
  downPct: 0.25,
  rate: 0.06,
  termYears: 30,
  propertyTaxRate: 0.012,
  prop13: true,
  insurancePerYear: 1_800,
  hoaPerMonth: 0,
  pmiRate: 0.005,
  extraPerMonth: 0,
  closingPct: 0.02,
}

const rent: RentInputs = {
  rentPerMonth: 2_500,
  rentersInsurancePerMonth: 20,
  rentGrowth: 0.03,
  appreciation: 0.03,
  investReturn: 0.07,
  maintenanceRate: 0.01,
  costGrowth: 0.03,
  sellingPct: 0.06,
  years: 30,
}

describe('monthlyPI', () => {
  it('matches the standard formula', () => {
    expect(monthlyPI(300_000, 0.06, 30)).toBeCloseTo(1798.65, 2)
    expect(monthlyPI(200_000, 0.05, 15)).toBeCloseTo(1581.59, 2)
  })
  it('handles a zero rate and an empty loan', () => {
    expect(monthlyPI(360_000, 0, 30)).toBe(1000)
    expect(monthlyPI(0, 0.06, 30)).toBe(0)
  })
})

describe('amortize', () => {
  it('pays the loan off in exactly the term', () => {
    const s = amortize(home)
    expect(s.months).toHaveLength(360)
    expect(s.months.at(-1)!.balance).toBeCloseTo(0, 2)
    const paid = s.months.reduce((a, m) => a + m.principal, 0)
    expect(paid).toBeCloseTo(300_000, 2)
    expect(s.totalInterest).toBeCloseTo(1798.65 * 360 - 300_000, -1)
  })

  it('finishes early and saves interest with extra payments', () => {
    const base = amortize(home)
    const extra = amortize({ ...home, extraPerMonth: 500 })
    expect(extra.months.length).toBeLessThan(base.months.length)
    expect(extra.totalInterest).toBeLessThan(base.totalInterest)
  })

  it('charges PMI only above 80% LTV and stops at 78%', () => {
    expect(amortize(home).totalPmi).toBe(0)
    const s = amortize({ ...home, downPct: 0.1 })
    expect(s.months[0].pmi).toBeCloseTo((360_000 * 0.005) / 12, 6)
    const last = s.months[s.pmiLastMonth - 1]
    const next = s.months[s.pmiLastMonth]
    expect(last.balance + last.principal).toBeGreaterThan(400_000 * PMI_DROP_LTV)
    expect(next.pmi).toBe(0)
  })

  it('rolls months into years', () => {
    const rows = byYear(amortize(home).months)
    expect(rows).toHaveLength(30)
    expect(rows[0].interest + rows[0].principal).toBeCloseTo(1798.65 * 12, 0)
  })
})

describe('firstMonth', () => {
  it('adds up PITI', () => {
    const f = firstMonth({ ...home, hoaPerMonth: 300 })
    expect(f.propertyTax).toBeCloseTo(400, 6)
    expect(f.insurance).toBe(150)
    expect(f.total).toBeCloseTo(1798.65 + 400 + 150 + 300, 1)
  })
})

describe('rentVsBuy', () => {
  it('returns a point per year plus the start', () => {
    const res = rentVsBuy(home, rent)
    expect(res.points).toHaveLength(31)
    expect(res.upfront).toBe(108_000)
    expect(res.points[0].rentNetWorth).toBe(108_000)
  })

  it('favors buying when rent is very high', () => {
    expect(rentVsBuy(home, { ...rent, rentPerMonth: 10_000 }).breakEvenYear).toBe(1)
  })

  it('never breaks even when rent is nearly free and homes do not appreciate', () => {
    expect(rentVsBuy(home, { ...rent, rentPerMonth: 100, appreciation: 0 }).breakEvenYear).toBeNull()
  })

  it('caps assessed value growth under Prop 13', () => {
    const hot = { ...rent, appreciation: 0.08, years: 10 }
    const capped = rentVsBuy(home, hot).points.at(-1)!
    const uncapped = rentVsBuy({ ...home, prop13: false }, hot).points.at(-1)!
    expect(capped.buyCostYear).toBeLessThan(uncapped.buyCostYear)
  })
})
