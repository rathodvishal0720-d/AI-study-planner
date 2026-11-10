"""AI Study Planner - rule-based scheduling logic (Python version of script.js).
Author: Vishal S. Rathod. Uses only the standard library; no external AI API.
Run:  python ai_scheduler.py
"""
from datetime import date, datetime, timedelta

DIFFICULTY = {"Easy": 1, "Medium": 2, "Hard": 3}
PRIORITY = {"Low": 1, "Medium": 2, "High": 3}
START_HOUR = {"morning": 8, "afternoon": 13, "evening": 18}


def days_until(exam, today=None):
    """Days from today to the exam date (YYYY-MM-DD). Negative = passed."""
    today = today or date.today()
    return (datetime.strptime(exam, "%Y-%m-%d").date() - today).days


def priority_score(subject, today=None, offset=0):
    """difficulty x priority x urgency. Urgency grows as the exam gets closer."""
    d = days_until(subject["exam"], today) - offset
    if d < 0:
        return 0.0
    urgency = 1 + min(10 / max(d, 1), 5)
    return DIFFICULTY[subject["difficulty"]] * PRIORITY[subject["priority"]] * urgency


def allocate_minutes(subjects, daily_hours, today=None, offset=0):
    """Split the day's minutes between subjects in proportion to their score."""
    scores = {s["name"]: priority_score(s, today, offset) for s in subjects}
    total = sum(scores.values())
    if total == 0:
        return {}
    alloc = {n: int(daily_hours * 60 * sc / total / 5 + 0.5) * 5 for n, sc in scores.items()}
    return {n: m for n, m in alloc.items() if m >= 15}


def _chunk(m):
    """Longest continuous session is 50 minutes."""
    if m <= 50:
        return m
    return -(-m // 10) * 5 if m < 75 else 50


def generate_timetable(subjects, daily_hours=4, preferred="morning", days=7, today=None):
    """Return a list of dicts: date, start, end, type, subject, minutes."""
    today = today or date.today()
    rows = []
    for i in range(days):
        day = today + timedelta(days=i)
        start = datetime.combine(day, datetime.min.time()) + timedelta(hours=START_HOUR[preferred])
        alloc = sorted(allocate_minutes(subjects, daily_hours, today, i).items(), key=lambda x: -x[1])
        n = 0
        for name, mins in alloc:
            while mins > 0:
                c = _chunk(mins)
                if n > 0:  # short break, longer after every 3rd session
                    b = 20 if n % 3 == 0 else 10
                    rows.append(_row(day, start, b, "Break", "Break"))
                    start += timedelta(minutes=b)
                rows.append(_row(day, start, c, "Study", name))
                start += timedelta(minutes=c)
                mins -= c
                n += 1
    return rows


def _row(day, start, minutes, kind, subject):
    end = start + timedelta(minutes=minutes)
    return {"date": str(day), "start": start.strftime("%H:%M"), "end": end.strftime("%H:%M"),
            "type": kind, "subject": subject, "minutes": minutes}


def recommend(subjects, tasks, studied_today=0, daily_goal=240, today=None):
    """Simple if/then study advice. tasks: [{'title','due','done'}]."""
    tips = []
    for s in sorted(subjects, key=lambda x: x["exam"]):
        d = days_until(s["exam"], today)
        if 0 <= d <= 7:
            tips.append(f"Revise {s['name']}: exam in {d} day(s).")
        if s["difficulty"] == "Hard" and s.get("progress", 0) < 50 and d >= 0:
            tips.append(f"Focus more on {s['name']} (Hard) - progress is {s.get('progress', 0)}%.")
    pending = [t for t in tasks if not t["done"]]
    if pending:
        tips.append(f"Complete {len(pending)} pending task(s).")
    if studied_today < daily_goal:
        tips.append(f"You studied {studied_today}/{daily_goal} min today. Keep a daily routine.")
    return tips or ["Great work! Keep following your timetable."]


if __name__ == "__main__":
    today = date.today()
    sample = [
        {"name": "Mathematics", "difficulty": "Hard", "priority": "High", "exam": str(today + timedelta(days=5)), "progress": 20},
        {"name": "English", "difficulty": "Easy", "priority": "Low", "exam": str(today + timedelta(days=20)), "progress": 60},
        {"name": "Physics", "difficulty": "Medium", "priority": "Medium", "exam": str(today + timedelta(days=10)), "progress": 40},
    ]
    tasks = [{"title": "Maths assignment", "due": str(today + timedelta(days=2)), "done": False}]
    print("Priority scores:")
    for s in sample:
        print(f"  {s['name']:12} {priority_score(s):6.2f}  (exam in {days_until(s['exam'])} days)")
    print("\nTimetable for today:")
    for r in generate_timetable(sample, 4, "morning", days=1):
        print(f"  {r['start']}-{r['end']}  {r['subject']}")
    print("\nRecommendations:")
    for t in recommend(sample, tasks, studied_today=60):
        print("  -", t)
