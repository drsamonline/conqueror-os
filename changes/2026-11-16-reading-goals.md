# Reading goals

**Behaviour change:** Today's Reading Progress widget gains an optional weekly target,
and Settings gains the control for it.

- `state.settings.readingGoal` — minutes per week, `0` = off (the default, so no existing
  save changes appearance until the owner sets one).
- `currentWeekKeys()` / `weeklyReadingMinutes()` / `readingGoalMinutes()` /
  `readingGoalView()` in `src/index.html`. Monday-start week, from `state.readingLog`.
- `tests/smoke.test.js` — 7 assertions: off by default, control present, target persists,
  week total (not today's), out-of-week minutes excluded, met goal is not an error state,
  `0` turns it off again. Mutation-checked: summing the whole log instead of the week
  turns 2 of them red (`65` becomes `1064`).
