# 📚 AI Study Planner

A responsive study-planning dashboard for college students. Built by **Vishal S. Rathod**.

**Features:** dashboard stats, subject management (search/filter), rule-based AI timetable (daily + weekly, CSV export), task manager, Pomodoro timer (25/5/15), Chart.js progress reports, smart recommendations, dark mode, deadline notifications. Data is saved in your browser's LocalStorage.

> The scheduling is transparent rule-based logic, not an external AI API.

## Folder structure
```
ai-study-planner/
├── index.html
├── style.css
├── script.js          # browser version of the scheduler
├── ai_scheduler.py    # Python version of the same logic (demo, not used by the website)
├── README.md
├── requirements.txt
└── assets/favicon.svg
```

## How the AI scheduler works
1. **Weight** = difficulty (1-3) × priority (1-3) × urgency (closer exam = higher).
2. Each day's study minutes are split in proportion to the weights, so hard, high-priority, soon-to-be-examined subjects get more time.
3. Sessions are at most 50 minutes, with 10-minute breaks (20 minutes after every third session).
4. A 7-day plan is produced, plus a weekly hours summary.

## Run locally
- Website: open `index.html` in a browser (internet needed once for Chart.js from a CDN).
- Python demo: `python ai_scheduler.py` (Python 3.8+, no packages needed).

## Upload to GitHub
1. Create a new public repository named `ai-study-planner` on github.com.
2. In this folder run:
```
git init
git add .
git commit -m "AI Study Planner"
git branch -M main
git remote add origin https://github.com/<your-username>/ai-study-planner.git
git push -u origin main
```
(Or use "Add file → Upload files" on GitHub and drag in everything.)

## Deploy on GitHub Pages
1. Repository → **Settings → Pages**.
2. Source: **Deploy from a branch**, branch `main`, folder `/ (root)` → **Save**.
3. Wait 1-2 minutes. Your site will be at:

`https://<your-username>.github.io/ai-study-planner/`

GitHub Pages cannot run Python, which is why `ai_scheduler.py` is kept separate.
