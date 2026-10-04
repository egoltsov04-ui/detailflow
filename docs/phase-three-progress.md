# Phase three: adaptive studio recommendations

## Implemented foundation

The Recommendations tab under Analytics and Finance computes evidence-based signals using only the current studio's data. It is a deterministic statistical engine, not an external LLM or a trained churn/price model.

- Repeat-visit signal: at least three completed visits, two intervals of at least a day, median interval at least seven days, elapsed time greater than 1.5 times the usual interval; excluded when a future booking exists.
- Timing: five approved timed jobs for the same service and title in 90 days, actual duration more than 120% of planned duration.
- Pricing review: twelve such jobs, duration more than 130% of plan. No suggested price or automatic price change; costs and scope must be reviewed.
- Add-on discussion: at least five orders containing both services, at least 35% of base-service orders; never a previously purchased add-on within the one-year observation window. Catalog service must remain active.
- Demand review: 40 bookings across observed weekdays, at least eight distinct weeks for the flagged day, booking count below 60% of the observed weekday average. This does not measure capacity or account for opening hours.

Every card shows its source counts and measurements. Empty histories produce no fictional recommendations. Refreshing the feed recalculates signals and deactivates stale ones. No messages, prices or appointments are changed.

## Adaptation

One replaceable rating per recommendation per studio: useful, not useful, done, undo. Owner/finance-enabled administrator feedback is shared. After five distinct rated recommendations in a category, a smoothed positive fraction adjusts that category's priority by at most 15 points. Repeated votes cannot multiply influence. Done is user-reported feedback, not verified profit. No cross-studio training or language-model retraining occurs.

Tables use RLS with the existing finance permission. Only RPCs may mutate records. Feed generation is serialized per studio. Masters and other studios cannot read or rate signals. Private client data is not sent to an external AI provider.

## Remaining phase-three work

- Validate false positives and usefulness on real studio history, including opening hours and service recurrence.
- Collect measured outcomes rather than treating feedback as evidence of increased revenue.
- Decide on and configure an external AI provider only if language explanations or an assistant are needed; preserve explicit consent and data minimization.
- Predictive pricing/churn requires sufficient real data and out-of-sample validation. No claim of a completed predictive AI phase.
