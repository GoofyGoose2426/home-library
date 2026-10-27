# Sharing plan: a secret view-only link

Draft for Alexandra's approval · 2026-10-27 · No code until approved.

You want co-workers and friends to browse your library. You chose **a secret link**: no sign-in, view only. Anyone with the link can look; nobody can change anything.

## This changes a project rule

Rule 1 in `CLAUDE.md` currently says "exactly one allowed login … No public routes, share links or sign-up page." It would become:

> **Owner-only editing.** Exactly one login (Alexandra's), and only she can change anything. One optional **secret view-only link**, which she can turn on, reset or turn off at any time, shows a read-only copy of the library without loans, keepsake notes or the Gone list. No sign-up page; no other public routes.

## What viewers see

| Shown | Hidden |
|---|---|
| The library: covers, grid and table, search, filters and sorts | **On loan to** names |
| Book pages: title, authors, series, description, format of each copy (Bookshelf / Kobo ebook…) | **Keepsake notes** |
| Read status, your star ratings with labels, writing quality, recommendation, narration | The **Gone list**, and copies on it |
| Genres, subgenres, tropes, vibe, spice, story focus | "Needs review" flags, sources, and every edit button and tool |
| "Do I own it?" (handy for friends buying you gifts) | Backups and the spreadsheet download |

The shared pages say "**Alexandra's library**" at the top, and tell search engines not to list them.

## How you control it

A **Sharing** page (in Tools) with:
- **Turn on sharing.** Creates the link. **Copy link** puts it on your clipboard to paste into a message.
- **Reset link.** The old link stops working at once, and you get a new one to send to the people you still want.
- **Turn off sharing.** Every link stops working.

## Safety

- The link holds a long random code, about as hard to guess as a strong password. Only a scrambled version is stored, so even the database doesn't hold the link itself.
- Viewers never touch your database directly. One read-only database function checks the code and returns only the "Shown" fields above. Your Row Level Security stays exactly as it is for everything else.
- Your cover photos are shown through short-lived links, the same way as for you.
- The risk with any secret link is that it gets forwarded. If that happens, tap **Reset link**.

## Steps

| # | Step | What you'll check |
|---|---|---|
| 1 | Update rule 1 in `CLAUDE.md` and `docs/build-plan.md`. Database: a `share_links` table (scrambled code, created, turned off) and the read-only function, with tests that loans, keepsake notes and the Gone list never come out. | — |
| 2 | **Sharing** page: turn on, copy, reset, turn off. | Turn it on and copy the link |
| 3 | **Shared pages**: library, book pages and "Do I own it?", view only. | Open the link in a private window and on a friend's phone |
| 4 | Test at phone width in light and dark mode, then publish. | Reset the link; the old one stops working |

## Cost

$0. It uses the same free Vercel and Supabase plans.

## One question

Should viewers see **author and character representation** once Phase 2 adds it? My suggestion: yes, since it comes from public sources, but you decide when it arrives.
