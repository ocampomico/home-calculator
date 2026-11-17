/** All rates are annual and written as decimals (6.5% is 0.065). */
export type HomeInputs = {
  price: number
  downPct: number
  rate: number
  termYears: number
  propertyTaxRate: number
  /** California Prop 13: assessed value grows at most 2% a year. */
  prop13: boolean
  insurancePerYear: number
  hoaPerMonth: number
  /** Annual PMI premium as a share of the original loan, charged while LTV is above 78%. */
  pmiRate: number
  extraPerMonth: number
  closingPct: number
}

export type RentInputs = {
  rentPerMonth: number
  rentersInsurancePerMonth: number
  rentGrowth: number
  appreciation: number
  investReturn: number
  maintenanceRate: number
  /** Growth of insurance, HOA, and other fixed costs. */
  costGrowth: number
  sellingPct: number
  years: number
}

export const PROP13_CAP = 0.02
/** PMI ends automatically once the balance reaches 78% of the original value. */
export const PMI_DROP_LTV = 0.78

export const loanAmount = (h: HomeInputs) => Math.max(0, h.price * (1 - h.downPct))

/** Fixed monthly principal and interest. */
export function monthlyPI(principal: number, rate: number, termYears: number): number {
  const n = Math.round(termYears * 12)
  if (principal <= 0 || n <= 0) return 0
  const r = rate / 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - (1 + r) ** -n)
}

export type Month = {
  /** 1-based month number. */
  n: number
  interest: number
  principal: number
  pmi: number
  balance: number
}

export type Schedule = {
  payment: number
  months: Month[]
  totalInterest: number
  totalPmi: number
  /** Month PMI was last charged, or 0 if never. */
  pmiLastMonth: number
}

export function amortize(h: HomeInputs, extraPerMonth = h.extraPerMonth): Schedule {
  const loan = loanAmount(h)
  const payment = monthlyPI(loan, h.rate, h.termYears)
  const r = h.rate / 12
  const pmiMonthly = loan > h.price * 0.8 ? (loan * h.pmiRate) / 12 : 0
  const months: Month[] = []
  let balance = loan
  let totalInterest = 0
  let totalPmi = 0
  let pmiLastMonth = 0
  const cap = Math.round(h.termYears * 12)

  for (let n = 1; balance > 0.005 && n <= cap; n++) {
    const pmi = pmiMonthly && balance > h.price * PMI_DROP_LTV ? pmiMonthly : 0
    const interest = balance * r
    const principal = Math.min(balance, payment - interest + Math.max(0, extraPerMonth))
    balance -= principal
    totalInterest += interest
    totalPmi += pmi
    if (pmi) pmiLastMonth = n
    months.push({ n, interest, principal, pmi, balance: Math.max(0, balance) })
  }
  return { payment, months, totalInterest, totalPmi, pmiLastMonth }
}

export type FirstMonth = {
  principalInterest: number
  propertyTax: number
  insurance: number
  hoa: number
  pmi: number
  total: number
}

export function firstMonth(h: HomeInputs): FirstMonth {
  const s = amortize(h, 0)
  const principalInterest = s.payment
  const propertyTax = (h.price * h.propertyTaxRate) / 12
  const insurance = h.insurancePerYear / 12
  const pmi = s.months[0]?.pmi ?? 0
  return {
    principalInterest,
    propertyTax,
    insurance,
    hoa: h.hoaPerMonth,
    pmi,
    total: principalInterest + propertyTax + insurance + h.hoaPerMonth + pmi,
  }
}

export type YearRow = { year: number; interest: number; principal: number; pmi: number; balance: number }

export function byYear(months: Month[]): YearRow[] {
  const rows: YearRow[] = []
  for (const m of months) {
    const year = Math.ceil(m.n / 12)
    let row = rows[year - 1]
    if (!row) rows.push((row = { year, interest: 0, principal: 0, pmi: 0, balance: m.balance }))
    row.interest += m.interest
    row.principal += m.principal
    row.pmi += m.pmi
    row.balance = m.balance
  }
  return rows
}

export type RentBuyPoint = {
  year: number
  homeValue: number
  balance: number
  /** Home value minus loan balance minus selling costs. */
  equity: number
  buyPortfolio: number
  buyNetWorth: number
  rentNetWorth: number
  buyCostYear: number
  rentCostYear: number
}

export type RentBuyResult = {
  points: RentBuyPoint[]
  /** First year buying is ahead, or null if renting stays ahead for the whole horizon. */
  breakEvenYear: number | null
  upfront: number
}

/**
 * Month-by-month simulation. Both sides spend the same each month: whoever's housing is cheaper
 * invests the difference, and the renter invests the down payment and closing costs on day one.
 * Ignores income taxes on both sides (mortgage interest deduction, capital gains).
 */
export function rentVsBuy(h: HomeInputs, r: RentInputs): RentBuyResult {
  const loan = loanAmount(h)
  const upfront = h.price * h.downPct + h.price * h.closingPct
  const schedule = amortize(h, 0)
  const monthlyGrowth = (rate: number) => (1 + rate) ** (1 / 12) - 1
  const gInvest = monthlyGrowth(r.investReturn)
  const gHome = monthlyGrowth(r.appreciation)
  const assessedGrowth = h.prop13 ? Math.min(r.appreciation, PROP13_CAP) : r.appreciation

  let homeValue = h.price
  let assessed = h.price
  let balance = loan
  let rent = r.rentPerMonth
  let fixedCostFactor = 1
  let buyPortfolio = 0
  let rentPortfolio = upfront
  let buyCostYear = 0
  let rentCostYear = 0

  const points: RentBuyPoint[] = [
    {
      year: 0,
      homeValue,
      balance,
      equity: homeValue - balance - homeValue * r.sellingPct,
      buyPortfolio: 0,
      buyNetWorth: homeValue - balance - homeValue * r.sellingPct,
      rentNetWorth: rentPortfolio,
      buyCostYear: 0,
      rentCostYear: 0,
    },
  ]
  let breakEvenYear: number | null = null

  for (let m = 1; m <= Math.round(r.years * 12); m++) {
    const sched = schedule.months[m - 1]
    const pi = sched ? sched.interest + sched.principal : 0
    const pmi = sched?.pmi ?? 0
    balance = sched ? sched.balance : 0

    const buyCost =
      pi +
      pmi +
      (assessed * h.propertyTaxRate) / 12 +
      ((h.insurancePerYear / 12) + h.hoaPerMonth) * fixedCostFactor +
      (homeValue * r.maintenanceRate) / 12
    const rentCost = rent + r.rentersInsurancePerMonth * fixedCostFactor
    buyCostYear += buyCost
    rentCostYear += rentCost

    buyPortfolio *= 1 + gInvest
    rentPortfolio *= 1 + gInvest
    if (buyCost > rentCost) rentPortfolio += buyCost - rentCost
    else buyPortfolio += rentCost - buyCost

    homeValue *= 1 + gHome

    if (m % 12 === 0) {
      const year = m / 12
      const equity = homeValue - balance - homeValue * r.sellingPct
      const buyNetWorth = equity + buyPortfolio
      points.push({ year, homeValue, balance, equity, buyPortfolio, buyNetWorth, rentNetWorth: rentPortfolio, buyCostYear, rentCostYear })
      if (breakEvenYear === null && buyNetWorth >= rentPortfolio) breakEvenYear = year
      buyCostYear = 0
      rentCostYear = 0
      rent *= 1 + r.rentGrowth
      assessed *= 1 + assessedGrowth
      fixedCostFactor *= 1 + r.costGrowth
    }
  }
  return { points, breakEvenYear, upfront }
}
