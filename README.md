# Home Calculator

A mortgage and rent-vs-buy calculator.

Everything runs in the browser. Inputs are stored in `localStorage` only; nothing is sent to a server.

## Features

- **Mortgage**: monthly payment broken into principal and interest, property tax, insurance, HOA, and PMI. Shows when PMI drops off (78% of the original value), total interest, payoff date, and how much sooner extra principal payments finish the loan. Includes a balance chart and a year-by-year amortization table.
- **Rent vs Buy**: simulates both paths month by month over a chosen number of years. Whichever side has cheaper housing invests the difference, and the renter invests the down payment and closing costs up front. Shows net worth for each path, the break-even year, and a year-by-year table. Has an optional California Prop 13 cap on assessed value growth.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # engine unit tests
npm run build   # production build into dist/
```

Production builds assume the app is served from `/tools/homecalculator/`. Set `BASE_PATH=/` to build for the site root.

## Structure

- `src/engine/mortgage.ts`: pure calculation engine (payment, amortization, PMI, rent vs buy). No UI imports; covered by `mortgage.test.ts`.
- `src/views/`: one file per tab.
- `src/state.tsx`: inputs, defaults, and persistence.

## Notes

Results are estimates for planning, not financial, tax, or legal advice. Rent vs buy ignores income taxes on both sides (mortgage interest deduction, capital gains).
