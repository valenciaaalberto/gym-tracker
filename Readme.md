# Gym Tracker

A simple, private workout tracker that runs in your browser and installs on your phone's home screen. Log every set, then see how your lifts progress over time. There is no account and no server, and your data stays on your device.

**Live site:** https://valenciaaalberto.github.io/gym-tracker/

## What it does

- **Log sets:** Pick an exercise, enter weight and reps, and tap Add. Optional fields cover side (left, right or each), failed last rep (shown as 🫠), assisted, and notes. Under the exercise it shows what you did last time, and bodyweight moves like pull-ups take optional added weight (`8` for unweighted, `8 × +25` for weighted).
- **Edit and rename:** Tap any logged set to change it. Rename an exercise or a muscle group and every past set follows. Renaming into an existing name offers a merge.
- **History:** Browse past sessions, newest first, filter by exercise, and tap a date to edit that day.
- **Progress charts:** Plot any exercise over time on a true date axis. Switch between top-set weight, estimated 1RM, and session volume, filter by 1 month, 3 months or all time, and tap a point to see that day's sets.
- **Muscle groups (optional):** Start with none, or create your own (as broad or specific as you like) from the log form. Each exercise has one group. Groups get their own volume chart and a 4-week table on the Progress tab.
- **Weekly volume and summary:** See total pounds lifted per week for the last eight weeks. An opt-in weekly summary compares the last completed week with the one before it (workouts, total reps, volume, and volume per muscle group), flagging changes of 10% or more. You choose which day your week starts on.
- **Backups:** Share a CSV backup through the iPhone share sheet (for example by email) or download it, and set an optional reminder (weekly, every 2 weeks, or monthly). Reminders appear when the app is open, since scheduled delivery would need a server.
- **Import and export:** Bring in existing history from CSV (duplicates are skipped), and export a CSV backup at any time.
- **Works offline:** Once loaded, the app runs without a connection.

## How your data is stored

All data is saved in your browser's IndexedDB, through [Dexie.js](https://dexie.org). Settings such as the backup reminder and week start day are kept in the browser's local storage. Nothing is sent anywhere. That makes it private, but it also means:

- Data lives only on the device and browser where you logged it. A laptop and a phone keep separate histories.
- Clearing browser data or deleting the home-screen app removes your history. **Export a CSV backup regularly.**
- On iPhone, Safari and the home-screen app store data separately, so add the app to your home screen first and then import your CSV from inside it.

## CSV format

One row per set. Import accepts these columns (plans to update these columns based on user feedback), and export writes them in this order:

| Column | Meaning |
|---|---|
| `date` | `YYYY-MM-DD` |
| `exercise` | Exercise name |
| `set` | Set number within that exercise and day |
| `weight` | Pounds (blank for unweighted bodyweight moves; added weight for weighted ones) |
| `reps` | Reps completed unaided; a trailing partial rep counts as .5 |
| `side` | Blank, `each`, Left (`L`), or Right(`R`) |
| `failed` | 1 if the last rep was failed |
| `assisted` | 1 if the set needed help or a spot (plans to maybe add number of assisted reps) |
| `effort_pct` | Effort for sprints (blank otherwise) |
| `muscle_group` | Optional group for the exercise (blank if untagged) |
| `notes` | Free text |

The `muscle_group` column is optional on import, so older CSVs without it still load.