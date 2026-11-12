# Control Centre: Design System (Style D, chosen 12 Nov 2026)

A blend of the **Mint** structure and the warm **Sandstone** ground. Calm, clear, one job per screen.

## Colour tokens
| Token | Hex | Use |
|---|---|---|
| `forest` | #1F5C46 | Primary actions, active tab, toggles on, progress fill |
| `mint` | #9CCBB8 | Secondary progress, calendar dots |
| `mint-soft` | #E3EFE9 | Calm chips ("Done", "On track"), soft buttons |
| `terracotta` | #A4532D | **Attention only:** overdue, low stock, money at risk |
| `clay-soft` | #F6E6DD | Alert chips/background (text #8A4321) |
| `sand` | #F6F2EC | App background |
| `sand-deep` | #EFEAE2 | Segmented control track, neutral chips |
| `white` | #FFFFFF | Cards, tab bar |
| `line` | #EFEDE8 | Dividers inside cards |
| `slate` | #5B636B | Labels, supporting text |
| `ink` | #1E242B | Main text |

Rule: **green means go or fine, terracotta means it needs attention now.** No other colours carry meaning.

## Typography
| Role | Font | Size / weight |
|---|---|---|
| Screen title | Source Serif 4 | 32–40, 600 |
| Section heading | Source Serif 4 | 22, 600 |
| Item title | Inter | 15, 600 |
| Body | Inter | 15, 400 |
| Supporting | Inter | 13, 400, slate |
| Section label | Inter | 11, 500, caps, letter-spacing 0.22em, slate |
| Big numbers | Source Serif 4 | 34–36, 600 |

## Shape & depth
- Cards: white, radius 22, shadow `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)`
- Buttons, inputs, chips, segmented controls: pill radius
- Icon tiles: radius 14
- Spacing: 20 px screen gutter, 10–14 px between cards

## Components
- **Primary button:** forest fill, white text, 54–56 px tall, **one per screen**, at the bottom within thumb reach
- **Secondary button:** mint-soft background, forest text and border
- **Urgent button:** terracotta fill (rare)
- **Toggle:** 52×32, forest on, #E2E2DD off
- **Segmented control:** product line filter (All · Rebar · Profiles · CFRP)
- **Status chip:** Done / On track (mint-soft), Overdue / Hot (clay-soft), Waiting (sand-deep)
- **List card:** title, one line of detail, one next action

## Screen rules
1. One screen, one job, one primary button.
2. Each role sees only its own home: Owner → Today; Despatch → My jobs; Applicator → Job card; Factory → Today's production.
3. At most 3–4 "needs you" items on a screen.
4. Every touch target is at least 44 px. Number fields open the numeric keypad.
5. Plain verbs on buttons: Add rate, Send, Release, Mark delivered, Submit.
6. Text contrast is at least 4.5:1, including small grey labels.
7. Dark mode follows the phone setting (to be specified when the app is built).

## Screens designed (UI canvas, Round 3)
Design system sheet · Owner Cockpit (laptop) · Today (phone) · Lead inbox · New quote · Despatch slip · CFRP job card · Daily production entry
