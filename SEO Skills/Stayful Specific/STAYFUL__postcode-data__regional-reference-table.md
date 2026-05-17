# Stayful — Regional Uplift Reference Table

**Scope: Stayful Airbnb-management overlay.** All regional conservative uplift figures. The "conservative figure" is what to use in copy; the "full range" is for internal reference only.

Refresh quarterly. New regions get added as the lead data grows.

---

## UK-wide conservative range

**48%–66%** — based on 185 property enquiries, bottom quartile.

Use on:
- Homepage
- Generic nationwide pages
- Pages without local data

---

## Regional conservative ranges

| Region | Conservative uplift | Full range |
|---|---|---|
| Greater Manchester | 79% | 78–117% |
| London | 58–69% | 67–134% |
| Nottingham | 46–51% | 46–109% |
| Sheffield | 51% | 46–112% |
| Leeds | 152–186% | 152–188% |
| Harrogate | 75% | 75–108% |
| Hull | 58–104% | 58–118% |
| Leicester | 61% | 51–130% |
| Southampton | 99% | 54–113% |
| North East | 55–68% | 68–133% |
| Devon | 67% | 67–249% (use 67% floor) |
| Reading / Berkshire | 47% | 47–53% |
| Bristol | 73% | 73–129% |
| Warwickshire | 71–94% | unchanged |
| Lincoln / Lincolnshire | 88–142% | unchanged |
| Brighton / Sussex | 99–125% | unchanged |
| Derby / Derbyshire | 124–163% | unchanged |
| Lancashire Coast | 64–87% | unchanged |
| Yorkshire Coast | 113% | unchanged |
| Edinburgh | 83% | 83–147% |
| Darlington / County Durham | 41–66% | unchanged |
| Peterborough | 42–49% | 42–83% |
| Liverpool | 35% | 35–67% (thin sample — flag when using) |
| Chester | 44% | 44–58% (thin sample — flag when using) |
| Bradford | 112% | 65–128% |
| Bath | 154–188% | — |
| York | 113–141% | — |
| Torbay / South Devon | 67–153% | use 67% floor |
| Birmingham | 68–145% | — |

---

## Notes per region

### Use the conservative figure in copy, not the full range

The conservative figure is what appears in body copy and the uplift component. The full range is internal reference for confirming the conservative figure is genuinely conservative.

### Leeds figures are genuine

The 152–186% uplift looks aggressive but is real — LTR rents are low in Leeds relative to STR demand. Present honestly; the data supports it.

### Liverpool and Chester have only 3 data points each

Flag when using:

> "Based on a limited sample of comparable properties in [Liverpool / Chester]; figures may vary."

### Devon maximum is driven by an outlier

The 249% full-range maximum reflects a single high-yield holiday let property. **Always use the 67% floor** in copy for Devon.

### Torbay / South Devon — same treatment

The 153% maximum reflects strong coastal properties. **Always use the 67% floor.**

### Birmingham — no full-range upper bound listed

The 68–145% range is the working conservative range; copy uses 68%.

---

## How to choose the conservative figure for copy

When the regional row shows a range (e.g. "58–69%" for London):

- For a city-level page (e.g. London), use the range: "58–69% conservative uplift"
- For a sub-area page (e.g. Camden, Hackney) with specific local data, use a single figure within the range that matches the local data
- For a generic regional reference, use the lower end of the range

When the regional row shows a single figure (e.g. "79%" for Greater Manchester):

- Use as-is

When the row shows a low-sample flag (Liverpool, Chester):

- Use the figure with the sample-size disclaimer
- Or skip the uplift component for that page and use other proof instead

---

## Regions not in the table

For a page covering a region not in the table:

1. **Closest match by geography** — use the figure from a nearby region
2. **Label as "based on comparable properties in the region"** — not "in [City X]"
3. **Or skip the uplift component** — use other proof for the page

Never invent a figure for a region without data.

---

## Refresh cadence

Quarterly:

- Pull the latest lead enquiry data
- Re-calculate conservative figures (25th percentile)
- Re-calculate full ranges
- Update this table
- Trigger updates across affected pages per `CORE__06_measurement__update-cadence-and-triggers.md` (event-triggered: business facts change)

New regions get added when:

- 10+ data points exist for the region (minimum for a non-flagged figure)
- The region has 1+ Stayful-managed properties (operational knowledge backs the data)

---

## Data integrity rules

- **Never round up the conservative figure** to make it look stronger — round down or use the actual percentile
- **Never use a regional figure for a postcode that's clearly anomalous** — flag and use the regional floor
- **Never blend regions** — Birmingham and Bristol are separate data sets; never average
- **Never use last quarter's figures after refresh** — once updated, the previous figures are deprecated

---

## How the table fits the broader workflow

| Workflow stage | Reference action |
|---|---|
| Phase 1 audit | Check whether uplift component is recommended (Conditions 1–5 in `STAYFUL__postcode-data__overview-and-matching.md`) |
| Phase 2 build | Pull the conservative figure from this table for the region |
| QA check | Verify the figure used does not exceed the conservative range |
| Quarterly refresh | Re-pull lead data, update the table, propagate changes |

---

## Related files

- `STAYFUL__postcode-data__overview-and-matching.md` — when to use postcode data
- `STAYFUL__postcode-data__uplift-component.md` — the component HTML and rules
- `STAYFUL__current__calculator-component.md` — the interactive calculator using the same data
- `CORE__06_measurement__update-cadence-and-triggers.md` — quarterly refresh protocol
