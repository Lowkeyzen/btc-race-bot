# btc-race-bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Lowkeyzen/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Lowkeyzen/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Entry for the make.fun bounty [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511).

A slow trend-following bot for cbBTC on the `agent-fun/bars-replay/v1` harness, long only,
one position, paper money. It enters on a 90-bar breakout while the close holds above the
EMA(120) trend line, stakes 95% of equity, and exits on a trend break (close 1% under the
EMA), a 3.5% trailing stop, or a 4% hard stop — trading rarely, because a full-size round
trip costs about 26 bps in fees, slippage and price impact. On the published dev window it
makes one trade and finishes at +28.31 USDC net PnL.

## Run

The grader runs it on Node 22 with no install step:

    node main.ts

It speaks newline-delimited JSON on stdin/stdout via the vendored SDK shim in
`vendor/makefun-bars.ts` (a byte-identical copy of the kit's `sdk/makefun-bars.ts`).

MIT licensed.
