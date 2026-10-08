# 10: Use centavo arithmetic for cash checkout

**What to build:** Cash checkout accepts exact decimal payments and calculates totals and change consistently in the API and checkout display.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 11.

- [ ] Calculate and compare monetary totals in integer centavos rather than unrounded floating-point amounts.
- [ ] A cart containing prices 0.10 and 0.20 accepts exact payment 0.30 and returns zero change.
- [ ] Quantities, decimal prices, insufficient cash, credit checkout, and ordinary change calculation still work.
- [ ] The displayed total, exact-payment preset, API total, saved sale/item amounts, and change agree to two decimal places.
- [ ] Tests cover the rounding reproduction, multiplied quantities, insufficient payment, and a credit sale; reject or consistently normalize unsupported fractional-cent inputs.
