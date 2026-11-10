/* AI Study Planner - Vishal S. Rathod. Rule-based scheduling; data saved in LocalStorage. */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'aiStudyPlannerV1';
let S = JSON.parse(localStorage.getItem(KEY) || 'null') ||
  { subjects: [], tasks: [], log: {}, set: { hours: 4, pref: 'morning', dark: false }, notified: '' };
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const today = () => iso(new Date());
const daysTo = d => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const DW = { Easy: 1, Medium: 2, Hard: 3 }, PW = { Low: 1, Medium: 2, High: 3 };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2400); };
const subName = id => (S.subjects.find(s => s.id === id) || {}).name || 'General';

/* ---------- AI scheduling rules ---------- */
// weight = difficulty x priority x exam urgency (closer exam => higher)
function weight(s, off = 0) {
  const d = daysTo(s.exam) - off;
  if (d < 0) return 0;
  return DW[s.diff] * PW[s.prio] * (1 + Math.min(10 / Math.max(d, 1), 5));
}
const prog = s => Math.min(100, Math.round(s.studied / (DW[s.diff] * 300) * 100)); // target = 5h x difficulty

function plan() {
  const rows = [], H = S.set.hours * 60, start = { morning: 480, afternoon: 780, evening: 1080 }[S.set.pref];
  for (let i = 0; i < 7; i++) {
    const date = iso(Date.now() + i * 864e5);
    const act = S.subjects.map(s => ({ s, w: weight(s, i) })).filter(x => x.w > 0);
    const tw = act.reduce((a, x) => a + x.w, 0);
    const items = act.map(x => ({ s: x.s, m: Math.round(H * x.w / tw / 5) * 5 })).filter(x => x.m >= 15).sort((a, b) => b.m - a.m);
    let t = start, n = 0;
    items.forEach(({ s, m }) => {
      while (m > 0) {
        const c = m <= 50 ? m : (m < 75 ? Math.ceil(m / 10) * 5 : 50);
        if (n > 0) { const b = n % 3 === 0 ? 20 : 10; rows.push({ date, start: hhmm(t), end: hhmm(t + b), subject: '☕ Break', type: 'Break', min: b }); t += b; }
        rows.push({ date, start: hhmm(t), end: hhmm(t + c), subject: s.name, type: 'Study', min: c });
        t += c; m -= c; n++;
      }
    });
  }
  return rows;
}

function recommend() {
  const r = [], now = today(), m = S.log[now] || 0, g = S.set.hours * 60;
  if (!S.subjects.length) return ['Add your subjects and exam dates to get personalised advice.'];
  S.subjects.filter(s => daysTo(s.exam) >= 0 && daysTo(s.exam) <= 7).sort((a, b) => a.exam.localeCompare(b.exam))
    .forEach(s => r.push(`Revise ${s.name}: exam ${daysTo(s.exam) === 0 ? 'is today' : 'in ' + daysTo(s.exam) + ' day(s)'}.`));
  S.subjects.filter(s => s.diff === 'Hard' && prog(s) < 50 && daysTo(s.exam) >= 0)
    .forEach(s => r.push(`Focus more on ${s.name} (Hard) - only ${prog(s)}% of your target is done.`));
  const late = S.tasks.filter(t => !t.done && daysTo(t.due) < 0).length, pend = S.tasks.filter(t => !t.done).length;
  if (late) r.push(`You have ${late} overdue task(s). Complete pending assignments first.`);
  else if (pend) r.push(`${pend} task(s) pending - finish them before their deadlines.`);
  if (m < g) r.push(`You studied ${m} of ${g} planned minutes today. Try a Pomodoro session!`);
  const active = [...Array(7)].filter((_, i) => S.log[iso(Date.now() - i * 864e5)] > 0).length;
  if (active < 5) r.push(`You studied on ${active} of the last 7 days. Maintain a consistent daily routine.`);
  return r.length ? r : ['Great work! Keep following your timetable.'];
}

/* ---------- rendering ---------- */
function render() {
  const done = S.tasks.filter(t => t.done).length, pend = S.tasks.length - done;
  const ex = S.subjects.filter(s => daysTo(s.exam) >= 0).sort((a, b) => a.exam.localeCompare(b.exam));
  const total = Math.round(Object.values(S.log).reduce((a, b) => a + b, 0) / 6) / 10;
  const week = [...Array(7)].reduce((a, _, i) => a + (S.log[iso(Date.now() - i * 864e5)] || 0), 0);
  const avg = S.subjects.length ? Math.round(S.subjects.reduce((a, s) => a + prog(s), 0) / S.subjects.length) : 0;
  const card = (i, l, v) => `<div class="card"><span>${i}</span><h3>${v}</h3><p>${l}</p></div>`;
  $('#stats').innerHTML = card('📘', 'Total Subjects', S.subjects.length) + card('⏱️', 'Study Hours', total) + card('✅', 'Completed Tasks', done) + card('📝', 'Pending Tasks', pend) + card('🎯', 'Upcoming Exams', ex.length);
  $('#pstats').innerHTML = card('🕒', 'Minutes this week', week) + card('📊', 'Overall progress', avg + '%') + card('✅', 'Tasks done', S.tasks.length ? Math.round(done / S.tasks.length * 100) + '%' : '0%');
  const g = S.set.hours * 60, m = S.log[today()] || 0, p = Math.min(100, Math.round(m / g * 100));
  $('#dayBar').style.width = p + '%'; $('#dayTxt').textContent = `${m} / ${g} min today (${p}%)`;
  $('#exams').innerHTML = ex.slice(0, 5).map(s => `<li>${esc(s.name)} - <b>${daysTo(s.exam) === 0 ? 'Today' : daysTo(s.exam) + ' days left'}</b></li>`).join('') || '<li>No upcoming exams</li>';
  const rec = recommend().map(x => `<li>${esc(x)}</li>`).join('');
  $$('.recs').forEach(u => u.innerHTML = rec);
  // subject select lists
  const opts = '<option value="">General</option>' + S.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  ['#ts', '#tsub'].forEach(id => { const v = $(id).value; $(id).innerHTML = opts; $(id).value = v; });
  // subjects table
  const q = $('#q').value.toLowerCase(), fd = $('#fd').value;
  const list = S.subjects.filter(s => s.name.toLowerCase().includes(q) && (!fd || s.diff === fd));
  $('#subList').innerHTML = '<tr><th>Subject</th><th>Difficulty</th><th>Exam</th><th>Priority</th><th>Progress</th><th></th></tr>' +
    (list.map(s => `<tr><td>${esc(s.name)}</td><td><span class="tag ${s.diff}">${s.diff}</span></td><td>${s.exam}${daysTo(s.exam) < 0 ? ' (passed)' : ' (' + daysTo(s.exam) + 'd)'}</td><td>${s.prio}</td><td>${prog(s)}%</td>
    <td><button class="btn sm" data-a="es" data-id="${s.id}">Edit</button> <button class="btn sm danger" data-a="ds" data-id="${s.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No subjects found.</td></tr>');
  // tasks
  const f = flt, tl = S.tasks.filter(t => f === 'all' || (f === 'done') === t.done).sort((a, b) => a.due.localeCompare(b.due));
  $('#taskList').innerHTML = tl.map(t => `<li class="${t.done ? 'done' : ''}"><input type="checkbox" data-a="tg" data-id="${t.id}" ${t.done ? 'checked' : ''}>
    <span class="t">${esc(t.title)} <small>(${esc(subName(t.subject))})</small></span><span class="${!t.done && daysTo(t.due) < 0 ? 'late' : ''}">Due ${t.due}</span>
    <button class="btn sm" data-a="et" data-id="${t.id}">Edit</button><button class="btn sm danger" data-a="dt" data-id="${t.id}">Delete</button></li>`).join('') || '<li class="empty">No tasks here.</li>';
  renderPlan();
  if ($('#progress').classList.contains('on')) charts();
}

function renderPlan() {
  const P = plan();
  if (!P.length) { $('#planOut').innerHTML = '<p class="empty">Add subjects with upcoming exam dates to generate your plan.</p>'; return; }
  const days = {}, wk = {};
  P.forEach(r => { (days[r.date] = days[r.date] || []).push(r); if (r.type === 'Study') wk[r.subject] = (wk[r.subject] || 0) + r.min; });
  $('#planOut').innerHTML = `<div class="panel"><h3>📅 Weekly Plan</h3><table><tr><th>Subject</th><th>Hours this week</th></tr>${Object.entries(wk).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${(v / 60).toFixed(1)} h</td></tr>`).join('')}</table></div>
  <div class="grid">${Object.entries(days).map(([d, rs]) => `<div class="panel"><h3>${new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h3><table>${rs.map(r => `<tr class="${r.type === 'Break' ? 'brk' : ''}"><td>${r.start} - ${r.end}</td><td>${esc(r.subject)}</td></tr>`).join('')}</table></div>`).join('')}</div>`;
}

let ch = {};
const mk = (id, cfg) => { if (ch[id]) ch[id].destroy(); ch[id] = new Chart($('#' + id), cfg); };
function charts() {
  if (typeof Chart === 'undefined') return;
  const days = [...Array(7)].map((_, i) => iso(Date.now() - (6 - i) * 864e5)), done = S.tasks.filter(t => t.done).length;
  mk('c1', { type: 'bar', data: { labels: days.map(d => d.slice(5)), datasets: [{ label: 'Minutes studied', data: days.map(d => S.log[d] || 0), backgroundColor: '#7c3aed', borderRadius: 8 }] } });
  mk('c2', { type: 'bar', data: { labels: S.subjects.map(s => s.name), datasets: [{ label: 'Progress %', data: S.subjects.map(prog), backgroundColor: '#3b82f6', borderRadius: 8 }] }, options: { indexAxis: 'y', scales: { x: { min: 0, max: 100 } } } });
  mk('c3', { type: 'doughnut', data: { labels: ['Completed', 'Pending'], datasets: [{ data: [done, S.tasks.length - done], backgroundColor: ['#7c3aed', '#cbd5e1'] }] } });
}

/* ---------- navigation ---------- */
function show(p) {
  $$('section').forEach(s => s.classList.toggle('on', s.id === p));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $('#side').classList.remove('open'); window.scrollTo(0, 0);
  if (p === 'progress') charts();
}
$$('nav button').forEach(b => b.onclick = () => show(b.dataset.p));
$('#menu').onclick = () => $('#side').classList.toggle('open');
$('#q').oninput = $('#fd').onchange = render;

/* ---------- subjects ---------- */
$('#sf').onsubmit = e => {
  e.preventDefault();
  const n = $('#sn').value.trim(), ex = $('#se').value, id = $('#sid').value;
  if (n.length < 2) return toast('Enter a subject name');
  if (!ex) return toast('Choose an exam date');
  if (!id && daysTo(ex) < 0) return toast('Exam date cannot be in the past');
  const o = { name: n, diff: $('#sd').value, exam: ex, prio: $('#sp').value };
  if (id) Object.assign(S.subjects.find(s => s.id === id), o); else S.subjects.push({ id: uid(), studied: 0, ...o });
  e.target.reset(); save(); render(); toast('Subject saved');
};
$('#sf').onreset = () => { $('#sid').value = ''; $('#sbtn').textContent = 'Add Subject'; };

/* ---------- planner ---------- */
$('#pf').onsubmit = e => {
  e.preventDefault();
  const h = parseFloat($('#ph').value);
  if (!(h >= 1 && h <= 12)) return toast('Enter hours between 1 and 12');
  S.set.hours = h; S.set.pref = $('#pp').value; save(); render();
  toast(S.subjects.length ? 'Timetable generated!' : 'Add subjects first');
};
$('#csv').onclick = () => {
  const P = plan(); if (!P.length) return toast('Nothing to export yet');
  const c = 'Date,Start,End,Type,Subject,Minutes\n' + P.map(r => [r.date, r.start, r.end, r.type, '"' + r.subject.replace(/"/g, '""') + '"', r.min].join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv' })); a.download = 'study_timetable.csv'; a.click();
};

/* ---------- tasks ---------- */
let flt = 'all';
$('#tf').onsubmit = e => {
  e.preventDefault();
  const t = $('#tt').value.trim(), d = $('#tdue').value, id = $('#tid').value;
  if (t.length < 2) return toast('Enter a task title');
  if (!d) return toast('Choose a deadline');
  const o = { title: t, subject: $('#ts').value, due: d };
  if (id) Object.assign(S.tasks.find(x => x.id === id), o); else S.tasks.push({ id: uid(), done: false, ...o });
  e.target.reset(); save(); render(); toast('Task saved');
};
$('#tf').onreset = () => { $('#tid').value = ''; $('#tbtn').textContent = 'Add Task'; };
$$('.flt').forEach(b => b.onclick = () => { flt = b.dataset.f; $$('.flt').forEach(x => x.classList.toggle('on', x === b)); render(); });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const { a, id } = b.dataset;
  if (a === 'es') { const s = S.subjects.find(x => x.id === id); $('#sid').value = id; $('#sn').value = s.name; $('#sd').value = s.diff; $('#se').value = s.exam; $('#sp').value = s.prio; $('#sbtn').textContent = 'Update Subject'; window.scrollTo(0, 0); }
  if (a === 'ds' && confirm('Delete this subject?')) { S.subjects = S.subjects.filter(x => x.id !== id); save(); render(); }
  if (a === 'et') { const t = S.tasks.find(x => x.id === id); $('#tid').value = id; $('#tt').value = t.title; $('#ts').value = t.subject; $('#tdue').value = t.due; $('#tbtn').textContent = 'Update Task'; window.scrollTo(0, 0); }
  if (a === 'dt' && confirm('Delete this task?')) { S.tasks = S.tasks.filter(x => x.id !== id); save(); render(); }
  if (a === 'tg') { const t = S.tasks.find(x => x.id === id); t.done = b.checked; save(); render(); }
});

/* ---------- Pomodoro timer ---------- */
const TL = { focus: 1500, short: 300, long: 900 }, TN = { focus: '📖 Focus session', short: '☕ Short break', long: '🌴 Long break' };
let tm = { mode: 'focus', left: 1500, id: null, done: 0 };
function drawT() {
  const t = String(Math.floor(tm.left / 60)).padStart(2, '0') + ':' + String(tm.left % 60).padStart(2, '0');
  $('#tdisp').textContent = t; $('#tmode').textContent = TN[tm.mode];
  $('#tcount').textContent = `Completed focus sessions: ${tm.done} (long break after every 4)`;
  document.title = tm.id ? t + ' - AI Study Planner' : 'AI Study Planner';
}
function beep() { try { const c = new AudioContext(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + .4); } catch (e) { } }
function tick() {
  if (--tm.left > 0) return drawT();
  clearInterval(tm.id); tm.id = null; beep();
  if (tm.mode === 'focus') {
    tm.done++; S.log[today()] = (S.log[today()] || 0) + 25;
    const s = S.subjects.find(x => x.id === $('#tsub').value); if (s) s.studied += 25;
    save(); render(); tm.mode = tm.done % 4 === 0 ? 'long' : 'short'; toast('Focus session complete! Take a break.');
  } else { tm.mode = 'focus'; toast('Break over - back to studying!'); }
  tm.left = TL[tm.mode]; drawT();
}
$('#tstart').onclick = () => { if (!tm.id) tm.id = setInterval(tick, 1000); drawT(); };
$('#tpause').onclick = () => { clearInterval(tm.id); tm.id = null; drawT(); };
$('#treset').onclick = () => { clearInterval(tm.id); tm.id = null; tm.left = TL[tm.mode]; drawT(); };

/* ---------- settings & notifications ---------- */
$('#dark').onchange = e => { S.set.dark = e.target.checked; document.body.classList.toggle('dark', S.set.dark); save(); };
$('#clear').onclick = () => { if (confirm('Delete ALL data?')) { localStorage.removeItem(KEY); location.reload(); } };
$('#notif').onclick = () => {
  if (!('Notification' in window)) return toast('Notifications are not supported here');
  Notification.requestPermission().then(p => { toast(p === 'granted' ? 'Notifications enabled' : 'Permission denied'); deadlines(); });
};
function deadlines() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || S.notified === today()) return;
  const msgs = S.tasks.filter(t => !t.done && daysTo(t.due) >= 0 && daysTo(t.due) <= 1).map(t => 'Task due soon: ' + t.title)
    .concat(S.subjects.filter(s => daysTo(s.exam) >= 0 && daysTo(s.exam) <= 3).map(s => `Exam soon: ${s.name} (${daysTo(s.exam)}d)`));
  if (msgs.length) { new Notification('AI Study Planner', { body: msgs.join('\n') }); S.notified = today(); save(); }
}

/* ---------- init ---------- */
document.body.classList.toggle('dark', S.set.dark); $('#dark').checked = S.set.dark;
$('#ph').value = S.set.hours; $('#pp').value = S.set.pref;
render(); drawT(); deadlines();
