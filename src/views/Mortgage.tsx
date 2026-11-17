import { useMemo } from 'react'
import { Legend, LineChart, type Series } from '../chart'
import { amortize, byYear, firstMonth, loanAmount } from '../engine/mortgage'
import { useStore } from '../state'
import { Card, Grid, Hero, Num, Pct, Select, usd } from '../ui'

const PARTS = [
  { key: 'principalInterest', label: 'Principal and interest', color: 'var(--series-1)' },
  { key: 'propertyTax', label: 'Property tax', color: 'var(--series-2)' },
  { key: 'insurance', label: 'Insurance', color: 'var(--series-3)' },
  { key: 'hoa', label: 'HOA', color: 'var(--series-4)' },
  { key: 'pmi', label: 'PMI', color: 'var(--series-5)' },
] as const

const TERMS = ['30', '20', '15', '10'].map((t) => ({ value: t, label: `${t} years` }))

/** "Mar 2056" for the month that is `months` from now. */
function monthFromNow(months: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function duration(months: number) {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y && `${y} yr`, m && `${m} mo`].filter(Boolean).join(' ') || '0 mo'
}

type BalancePoint = { year: number; base: number; extra: number }

export function Mortgage() {
  const { home, setHome } = useStore()
  const first = useMemo(() => firstMonth(home), [home])
  const base = useMemo(() => amortize(home, 0), [home])
  const withExtra = useMemo(() => amortize(home), [home])
  const hasExtra = home.extraPerMonth > 0
  const loan = loanAmount(home)
  const shown = hasExtra ? withExtra : base

  const points: BalancePoint[] = useMemo(() => {
    const b = byYear(base.months)
    const e = byYear(withExtra.months)
    return [{ year: 0, base: loan, extra: loan }, ...b.map((r, i) => ({ year: r.year, base: r.balance, extra: e[i]?.balance ?? 0 }))]
  }, [base, withExtra, loan])

  const series: Series<'base' | 'extra'>[] = hasExtra
    ? [
        { key: 'extra', label: `With ${usd(home.extraPerMonth)}/mo extra`, color: 'var(--ink)', width: 2.5 },
        { key: 'base', label: 'Scheduled', color: 'var(--field)', dashed: true },
      ]
    : [{ key: 'base', label: 'Loan balance', color: 'var(--ink)', width: 2.5 }]

  const rows = byYear(shown.months)

  return (
    <div className="space-y-5">
      <Hero label="Monthly payment" live>
        <p className="num mt-1 text-4xl font-semibold tracking-tight">{usd(first.total)}</p>
        <p className="mt-1 text-sm text-muted">
          {usd(loan)} loan at {(home.rate * 100).toFixed(3).replace(/\.?0+$/, '')}% for {home.termYears} years
        </p>
        {first.total > 0 && (
          <>
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
              {PARTS.map((p) => (first[p.key] > 0 ? <div key={p.key} style={{ width: `${(first[p.key] / first.total) * 100}%`, background: p.color }} /> : null))}
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {PARTS.filter((p) => first[p.key] > 0).map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ background: p.color }} />
                  <dt className="text-muted">{p.label}</dt>
                  <dd className="num ml-auto font-medium">{usd(first[p.key])}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </Hero>

      <Card title="Home and loan">
        <Grid>
          <Num label="Home price" prefix="$" value={home.price} onChange={(price) => setHome({ price })} />
          <Pct label="Down payment" value={home.downPct} onChange={(downPct) => setHome({ downPct })} hint={usd(home.price * home.downPct)} />
          <Pct label="Interest rate" value={home.rate} onChange={(rate) => setHome({ rate })} max={30} />
          <Select label="Term" value={String(home.termYears)} options={TERMS} onChange={(t) => setHome({ termYears: Number(t) })} />
          <Pct label="Property tax rate" value={home.propertyTaxRate} onChange={(propertyTaxRate) => setHome({ propertyTaxRate })} max={10} hint="Per year, of the price" />
          <Num label="Home insurance" prefix="$" suffix="/yr" value={home.insurancePerYear} onChange={(insurancePerYear) => setHome({ insurancePerYear })} />
          <Num label="HOA" prefix="$" suffix="/mo" value={home.hoaPerMonth} onChange={(hoaPerMonth) => setHome({ hoaPerMonth })} />
          <Pct
            label="PMI rate"
            value={home.pmiRate}
            onChange={(pmiRate) => setHome({ pmiRate })}
            max={5}
            hint={home.downPct < 0.2 ? 'Per year, of the loan' : 'Not charged with 20% down'}
          />
        </Grid>
      </Card>

      <Card title="Extra payments">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-end">
          <Num label="Extra principal" prefix="$" suffix="/mo" value={home.extraPerMonth} onChange={(extraPerMonth) => setHome({ extraPerMonth })} />
          <p className="text-sm text-muted" aria-live="polite">
            {hasExtra ? (
              <>
                Paid off <span className="font-medium text-ink">{duration(base.months.length - withExtra.months.length)} sooner</span>, saving{' '}
                <span className="num font-medium text-ink">{usd(base.totalInterest + base.totalPmi - withExtra.totalInterest - withExtra.totalPmi)}</span> in interest and PMI.
              </>
            ) : (
              'Add an amount to see how much sooner the loan is paid off.'
            )}
          </p>
        </div>
      </Card>

      <Card title="Over the life of the loan">
        <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Total interest', usd(shown.totalInterest)],
            ['Total PMI', shown.totalPmi ? usd(shown.totalPmi) : 'None'],
            ['PMI ends', shown.pmiLastMonth ? monthFromNow(shown.pmiLastMonth) : 'No PMI'],
            ['Paid off', shown.months.length ? monthFromNow(shown.months.length) : 'No loan'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="num mt-0.5 text-lg font-semibold tracking-tight">{v}</dd>
            </div>
          ))}
        </dl>
        {loan > 0 && (
          <>
            <Legend series={series} />
            <LineChart points={points} series={series} label="Loan balance by year" />
          </>
        )}
      </Card>

      {rows.length > 0 && (
        <Card>
          <details>
            <summary className="flex cursor-pointer items-center justify-between text-[15px] font-semibold tracking-tight">
              Amortization by year
              <span className="text-[13px] font-normal text-muted">Show</span>
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="num w-full min-w-[28rem] text-right text-sm">
                <thead className="text-[13px] text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 text-left font-medium">Year</th>
                    <th className="py-2 font-medium">Interest</th>
                    <th className="py-2 font-medium">Principal</th>
                    <th className="py-2 font-medium">PMI</th>
                    <th className="py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.year} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-left">{r.year}</td>
                      <td className="py-1.5">{usd(r.interest)}</td>
                      <td className="py-1.5">{usd(r.principal)}</td>
                      <td className="py-1.5">{r.pmi ? usd(r.pmi) : '-'}</td>
                      <td className="py-1.5">{usd(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      )}
    </div>
  )
}
