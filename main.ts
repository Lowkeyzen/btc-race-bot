// btc-race-bot: a slow trend-following bot for cbBTC, long only, one position.
//
// Design (a full-size round trip costs ~26 bps in fees, slippage and impact, so the bot
// trades rarely and only on confirmed moves):
//   - Trend: EMA(120) of the 1-minute closes, seeded as the mean of its first 120 closes,
//     then moving 2 / (120 + 1) of the way to each new close. All closes feed it, warm-up
//     batches included; no order is sent while warming up.
//   - Entry: flat, the close is above the EMA by more than 5 bps and is the highest close
//     of the last 90 bars (a breakout over the last 1.5 hours). The buy spends 95% of the
//     equity, under the position weight cap.
//   - Exit, the whole position, on the first of:
//       the close a full 1% below the EMA (the trend broke),
//       the position's value at 96.5% or less of its peak value since entry (trailing stop),
//       the position's value at 96% or less of its cost (hard stop).
//     An exit whose fill the market refuses is sent again on the next bar while its reason
//     still holds.
//   - Every order caps its slippage at 100 bps past the close it was decided on.
//   - Indicators run in float64 on + - * / alone and the stops on bigint ratios, so the
//     same bars give the same orders, run after run.

import { BPS, runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_SPAN = 120;
const BREAKOUT_BARS = 90;
const ENTRY_MARGIN = 1.0005; // close must clear the EMA by 5 bps
const EXIT_MARGIN = 0.99; // close 1% under the EMA breaks the trend
const TRAIL = [193n, 200n] as const; // exit at 96.5% of the peak value
const HARD_STOP = [24n, 25n] as const; // exit at 96% of cost
const STAKE_BPS = 9500n; // spend 95% of equity on an entry
const MAX_SLIPPAGE_BPS = 100;

/** EMA(120): the closes it has seen until it starts, then its value. */
const emaWarm: number[] = [];
let ema: number | null = null;
/** The last BREAKOUT_BARS closes, oldest first, for the breakout high. */
const recent: number[] = [];
/** Peak position value (quote units) since the position appeared; null while flat. */
let peakValue: bigint | null = null;

function stepIndicators(close: number): void {
  if (ema !== null) {
    ema += (2 / (EMA_SPAN + 1)) * (close - ema);
  } else {
    emaWarm.push(close);
    if (emaWarm.length === EMA_SPAN) ema = emaWarm.reduce((a, x) => a + x, 0) / EMA_SPAN;
  }
  recent.push(close);
  if (recent.length > BREAKOUT_BARS) recent.shift();
}

await runBars({
  onBatch(state, batch) {
    let close: number | null = null;
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      close = Number(bar.c);
      stepIndicators(close);
    }
    if (state.warmingUp || close === null || ema === null) return [];

    const { caps, fees } = state.hello;
    const held = state.positions.get(SYMBOL);

    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      if (peakValue === null || value > peakValue) peakValue = value;
      const trendBroke = close < ema * EXIT_MARGIN;
      const trailed = peakValue !== null && value * TRAIL[1] <= peakValue * TRAIL[0];
      const stopped = value * HARD_STOP[1] <= held.cost * HARD_STOP[0];
      if (trendBroke || trailed || stopped) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    peakValue = null;
    const isBreakout = recent.length === BREAKOUT_BARS && close >= Math.max(...recent);
    if (isBreakout && close > ema * ENTRY_MARGIN) {
      const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
      const byStake = (STAKE_BPS * state.equity) / BPS;
      let slice = byWeight < byStake ? byWeight : byStake;
      if (state.cash < slice) slice = state.cash;
      if (slice > 0n && slice >= BigInt(fees.min_notional_quote_units)) {
        const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [buy];
      }
    }
    return [];
  },
});
