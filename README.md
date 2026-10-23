# Home Library Catalog — Claude Code starter kit

## What's in here

| File | What it's for |
|---|---|
| `CLAUDE.md` | Project instructions Claude Code reads automatically every session: stack, rules, working style |
| `docs/build-plan.md` | The full product spec (copy of the Build Plan doc) |
| `docs/kickoff-prompt.md` | Your first message to Claude Code, plus prompts for later phases |
| `data/seed-books.json` / `.csv` | The 428 print books catalogued from your shelf photos |

## Getting started

1. **Install Claude Code.** Follow Anthropic's install guide at [docs.claude.com](https://docs.claude.com) (search "Claude Code quickstart"). The desktop app also works if you'd rather not use a terminal.
2. **Unzip this folder** somewhere you'll keep it, e.g. `Documents/home-library`.
3. **Open Claude Code in that folder.** In a terminal: `cd` into the folder, then run `claude`. In the desktop app: open the folder as a project.
4. **Switch to plan mode** (Shift+Tab) and paste the prompt from `docs/kickoff-prompt.md`.
5. **Answer its questions** and approve the schema and Phase 1 plan before it writes code.

## Accounts you'll likely need

Claude Code will confirm these with you and walk you through each one:

- **GitHub:** stores the code (free)
- **Supabase:** database, private login, cover storage (free tier is enough to start)
- **Vercel:** hosts the app so it works on your phone (free tier for personal use)
- **Anthropic API key:** powers prefill and "Ask your library". This is billed per use and separate from your Claude subscription. Ask Claude Code for a cost estimate before turning it on.

## Keeping the spec in sync

If you change the Build Plan doc, re-export it over `docs/build-plan.md`, or tell Claude Code what changed, so the two don't drift apart.
