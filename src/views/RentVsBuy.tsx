import { useMemo } from 'react'
import { Legend, LineChart, type Series } from '../chart'
import { rentVsBuy } from '../engine/mortgage'
import { useStore } from '../state'
import { Card, Grid, Hero, Num, Pct, Toggle, usd } from '../ui'

const SERIES: Series<'buyNetWorth' | 'rentNetWorth'>[] = [
  { key: 'buyNetWorth', label: 'Buy: home equity after selling costs, plus investments', color: 'var(--series-1)', width: 2.5 },
  { key: 'rentNetWorth', label: 'Rent: investments', color: 'var(--series-2)', width: 2.5 },
]

export function RentVsBuy({ goToMortgage }: { goToMortgage: () => void }) {
  const { home, setHome, rent, setRent } = useStore()
  const res = useMemo(() => rentVsBuy(home, rent), [home, rent])
  const end = res.points.at(-1)!
  const gap = end.buyNetWorth - end.rentNetWorth
  const years = Math.round(rent.years)

  return (
    <div className="space-y-5">
      <Hero label={`After ${years} ${years === 1 ? 'year' : 'years'}`} live>
        <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {gap >= 0 ? 'Buying' : 'Renting'} leaves you <span className="num">{usd(Math.abs(gap))}</span> ahead
        </p>
        <p className="mt-1 text-sm text-muted">
          {res.breakEvenYear === null
            ? `Renting stays ahead for all ${years} years.`
            : res.breakEvenYear === 1
              ? 'Buying is ahead from the first year.'
              : `Buying pulls ahead in year ${res.breakEvenYear}. Sell before that and renting would have been better.`}
        </p>
      </Hero>

      <Card
        title="Net worth by year"
        aside={
          <button type="button" onClick={goToMortgage} className="underline underline-offset-2 hover:text-ink">
            {usd(home.price)} home, {Math.round(home.downPct * 100)}% down, {(home.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%
          </button>
        }
      >
        <Legend series={SERIES} />
        <LineChart points={res.points} series={SERIES} label="Net worth if you buy versus rent, by year" />
      </Card>

      <Card title="Renting">
        <Grid>
          <Num label="Rent" prefix="$" suffix="/mo" value={rent.rentPerMonth} onChange={(rentPerMonth) => setRent({ rentPerMonth })} />
          <Num label="Renters insurance" prefix="$" suffix="/mo" value={rent.rentersInsurancePerMonth} onChange={(rentersInsurancePerMonth) => setRent({ rentersInsurancePerMonth })} />
          <Pct label="Rent increase" value={rent.rentGrowth} onChange={(rentGrowth) => setRent({ rentGrowth })} max={20} hint="Per year" />
        </Grid>
      </Card>

      <Card title="Buying">
        <Grid>
          <Pct label="Home appreciation" value={rent.appreciation} onChange={(appreciation) => setRent({ appreciation })} max={20} hint="Per year" />
          <Pct label="Maintenance" value={rent.maintenanceRate} onChange={(maintenanceRate) => setRent({ maintenanceRate })} max={10} hint="Per year, of home value" />
          <Pct label="Closing costs" value={home.closingPct} onChange={(closingPct) => setHome({ closingPct })} max={10} hint={`${usd(home.price * home.closingPct)} at purchase`} />
          <Pct label="Selling costs" value={rent.sellingPct} onChange={(sellingPct) => setRent({ sellingPct })} max={15} hint="Agent fees, transfer tax" />
          <Pct label="Fixed cost increase" value={rent.costGrowth} onChange={(costGrowth) => setRent({ costGrowth })} max={20} hint="Insurance and HOA, per year" />
        </Grid>
        <div className="mt-3">
          <Toggle label="California Prop 13 (assessed value rises at most 2% a year)" checked={home.prop13} onChange={(prop13) => setHome({ prop13 })} />
        </div>
      </Card>

      <Card title="Investing and time">
        <Grid>
          <Pct label="Investment return" value={rent.investReturn} onChange={(investReturn) => setRent({ investReturn })} max={20} hint="Per year, on money not spent on housing" />
          <Num label="Years before selling" value={rent.years} onChange={(y) => setRent({ years: Math.max(1, Math.round(y)) })} max={40} />
        </Grid>
      </Card>

      <Card>
        <details>
          <summary className="flex cursor-pointer items-center justify-between text-[15px] font-semibold tracking-tight">
            Year by year
            <span className="text-[13px] font-normal text-muted">Show</span>
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="num w-full min-w-[34rem] text-right text-sm">
              <thead className="text-[13px] text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 text-left font-medium">Year</th>
                  <th className="py-2 font-medium">Cost to own</th>
                  <th className="py-2 font-medium">Cost to rent</th>
                  <th className="py-2 font-medium">Home value</th>
                  <th className="py-2 font-medium">Buy net worth</th>
                  <th className="py-2 font-medium">Rent net worth</th>
                </tr>
              </thead>
              <tbody>
                {res.points.slice(1).map((p) => (
                  <tr key={p.year} className="border-b border-line last:border-0">
                    <td className="py-1.5 text-left">{p.year}</td>
                    <td className="py-1.5">{usd(p.buyCostYear)}</td>
                    <td className="py-1.5">{usd(p.rentCostYear)}</td>
                    <td className="py-1.5">{usd(p.homeValue)}</td>
                    <td className={`py-1.5 ${p.buyNetWorth >= p.rentNetWorth ? 'font-semibold' : ''}`}>{usd(p.buyNetWorth)}</td>
                    <td className={`py-1.5 ${p.rentNetWorth > p.buyNetWorth ? 'font-semibold' : ''}`}>{usd(p.rentNetWorth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <Card title="How this is worked out">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>
            Both sides spend the same each month. If owning costs more than renting, the renter invests the difference; if renting costs more, the owner does.
          </li>
          <li>The renter invests the down payment and closing costs ({usd(res.upfront)}) on day one.</li>
          <li>Owning costs are principal and interest, property tax, insurance, HOA, PMI, and maintenance. Extra principal payments are left out here.</li>
          <li>Buy net worth assumes you sell at the end and pay selling costs.</li>
          <li>
            Income taxes are ignored on both sides: no mortgage interest deduction, and no capital gains tax on the investments or the home sale.
          </li>
        </ul>
      </Card>
    </div>
  )
}
