
const schedule = window.SCHEDULE_DATA || {};
const lunchBreaks = window.LUNCH_BREAKS || {};
const consultants = Object.keys(schedule).sort();

const consultantSearch = document.getElementById('consultantSearch');
const clearSearch = document.getElementById('clearSearch');
const consultantList = document.getElementById('consultantList');
const countBadge = document.getElementById('countBadge');
const emptyState = document.getElementById('emptyState');
const consultantView = document.getElementById('consultantView');
const consultantName = document.getElementById('consultantName');
const totalTurns = document.getElementById('totalTurns');
const lunchCount = document.getElementById('lunchCount');
const lunchCard = document.getElementById('lunchCard');
const daysContainer = document.getElementById('daysContainer');
const nowCard = document.getElementById('nowCard');
const quickStatus = document.getElementById('quickStatus');
const searchPanel = document.querySelector('.search-panel');
const toggleList = document.getElementById('toggleList');

function isMobileLayout(){
  return window.matchMedia('(max-width: 860px)').matches;
}

function collapseSearchPanel(){
  if(isMobileLayout()){
    searchPanel.classList.add('collapsed');
  }
}

function expandSearchPanel(){
  searchPanel.classList.remove('collapsed');
}

toggleList.addEventListener('click', () => {
  searchPanel.classList.toggle('collapsed');
});

function normalize(value){
  return (value || '').toString().trim().toLowerCase();
}

function parseHour(slot){
  if(!slot) return null;
  const part = slot.split('-')[0];
  const [h,m] = part.split(':').map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function parseRange(slot){
  if(!slot || !slot.includes('-')) return null;
  const [start,end] = slot.split('-').map(s=>s.trim());
  const startMin = parseHour(start + '-x');
  const endPart = end.split(':').map(Number);
  if(startMin === null || endPart.some(Number.isNaN)) return null;
  return {start:startMin,end:endPart[0]*60+endPart[1]};
}

function getCurrentInfo(name){
  const days = schedule[name] || {};
  const lunch = lunchBreaks[name] || {};
  const now = new Date();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const weekday = ['DOMENICA','LUNEDÌ','MARTEDÌ','MERCOLEDÌ','GIOVEDÌ','VENERDÌ','SABATO'][now.getDay()];
  const activeDay = Object.keys(days).find(day => day.startsWith(weekday));
  if(!activeDay) return null;
  const slots = days[activeDay] || {};
  let currentShift = null;
  let nextShift = null;

  for(const [time, station] of Object.entries(slots)){
    const range = parseRange(time);
    if(!range) continue;
    if(hhmm >= range.start && hhmm < range.end) currentShift = {time, station};
    if(!nextShift && hhmm < range.start) nextShift = {time, station};
  }

  let lunchSlot = lunch[activeDay] || '';
  let lunchNow = false;
  if(lunchSlot){
    const range = parseRange(lunchSlot);
    if(range && hhmm >= range.start && hhmm < range.end) lunchNow = true;
  }

  return {activeDay, currentShift, nextShift, lunchSlot, lunchNow};
}

function renderConsultantList(filter = ''){
  const filtered = consultants.filter(name => normalize(name).includes(normalize(filter)));
  countBadge.textContent = filtered.length;
  consultantList.innerHTML = '';
  if(!filtered.length){
    consultantList.innerHTML = '<div class="consultant-btn">Nessun consulente trovato</div>';
    return;
  }
  filtered.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'consultant-btn';
    btn.type = 'button';
    btn.dataset.name = name;
    btn.innerHTML = '<span>' + name + '</span><small>Tocca per vedere i turni</small>';
    btn.addEventListener('click', () => selectConsultant(name));
    consultantList.appendChild(btn);
  });
  highlightActiveButton();
}

let activeConsultant = '';

function highlightActiveButton(){
  [...document.querySelectorAll('.consultant-btn')].forEach(btn => {
    btn.classList.toggle('active', btn.dataset.name === activeConsultant);
  });
}

function setHash(name){
  history.replaceState(null, '', '#' + encodeURIComponent(name));
}

function selectConsultant(name){
  activeConsultant = name;
  setHash(name);
  consultantName.textContent = name;
  const days = schedule[name] || {};
  const lunch = lunchBreaks[name] || {};
  const lunchEntries = Object.entries(lunch).filter(([,slot]) => slot);
  const turns = Object.values(days).reduce((sum, day) => sum + Object.keys(day || {}).length, 0);
  totalTurns.textContent = turns;
  lunchCount.textContent = lunchEntries.length;
  emptyState.classList.add('hidden');
  consultantView.classList.remove('hidden');

  renderNowCard(name);
  renderLunchCard(lunchEntries);
  renderDays(name);

  quickStatus.classList.remove('hidden');
  quickStatus.textContent = 'Stai guardando: ' + name;
  highlightActiveButton();

  collapseSearchPanel();
  if(isMobileLayout()){
    consultantView.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function renderNowCard(name){
  const info = getCurrentInfo(name);
  if(!info){
    nowCard.classList.add('hidden');
    nowCard.innerHTML = '';
    return;
  }
  const title = info.lunchNow ? 'Sei in pausa pranzo' : (info.currentShift ? 'Turno in corso' : 'Prossimo turno');
  const main = info.lunchNow
    ? (info.lunchSlot || 'Pausa pranzo')
    : (info.currentShift ? (info.currentShift.station || '—') : (info.nextShift ? (info.nextShift.station || '—') : 'Nessun turno attivo'));
  const sub = info.lunchNow
    ? (info.activeDay + ' · ' + info.lunchSlot)
    : (info.currentShift
      ? (info.activeDay + ' · ' + info.currentShift.time)
      : (info.nextShift ? (info.activeDay + ' · ' + info.nextShift.time) : 'Fuori dall’orario fiera'));

  nowCard.classList.remove('hidden');
  nowCard.innerHTML = `
    <div class="now-title">${title}</div>
    <div class="now-main">${main}</div>
    <div class="now-sub">${sub}</div>
  `;
}

function renderLunchCard(lunchEntries){
  if(!lunchEntries.length){
    lunchCard.classList.add('hidden');
    lunchCard.innerHTML = '';
    return;
  }
  lunchCard.classList.remove('hidden');
  lunchCard.innerHTML = `
    <div class="lunch-title">Pause pranzo</div>
    <div class="lunch-list">
      ${lunchEntries.map(([day, slot]) => `
        <div class="lunch-item">
          <strong>${day}</strong>
          <span>${slot}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDays(name){
  const days = schedule[name] || {};
  const lunch = lunchBreaks[name] || {};
  const info = getCurrentInfo(name);
  daysContainer.innerHTML = '';
  Object.entries(days).forEach(([day, slots]) => {
    const card = document.createElement('section');
    card.className = 'card day-card';
    const filledCount = Object.values(slots).filter(Boolean).length;
    const lunchSlot = lunch[day] || '';
    card.innerHTML = `
      <div class="day-header">
        <h3>${day}</h3>
        <span class="day-badge">${filledCount} fasce</span>
      </div>
      <div class="shift-list">
        ${Object.entries(slots).map(([time, station]) => {
          const isCurrent = info && info.activeDay === day && info.currentShift && info.currentShift.time === time;
          const isLunch = !!lunchSlot && lunchSlot === time;
          return `
            <div class="shift-row ${isCurrent ? 'current' : ''} ${isLunch ? 'lunch' : ''}">
              <div class="shift-time">${time}</div>
              <div class="shift-station">
                <span class="station-pill ${station ? '' : 'station-empty'}">${station || '—'}</span>
                ${isLunch ? '<div class="mobile-only" style="margin-top:6px;color:#005d9a;font-weight:700;">🍝 Pausa pranzo</div>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    daysContainer.appendChild(card);
  });
}

function initFromHash(){
  const hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if(hash && schedule[hash]){
    consultantSearch.value = hash;
    renderConsultantList(hash);
    selectConsultant(hash);
    return;
  }
  renderConsultantList('');
}

consultantSearch.addEventListener('input', (e) => {
  expandSearchPanel();
  const value = e.target.value;
  renderConsultantList(value);
  const exact = consultants.find(name => normalize(name) === normalize(value));
  if(exact){
    selectConsultant(exact);
  } else if(activeConsultant && !normalize(activeConsultant).includes(normalize(value))){
    activeConsultant = '';
    emptyState.classList.remove('hidden');
    consultantView.classList.add('hidden');
    quickStatus.classList.add('hidden');
    highlightActiveButton();
  }
});

clearSearch.addEventListener('click', () => {
  consultantSearch.value = '';
  activeConsultant = '';
  history.replaceState(null, '', location.pathname);
  quickStatus.classList.add('hidden');
  emptyState.classList.remove('hidden');
  consultantView.classList.add('hidden');
  expandSearchPanel();
  renderConsultantList('');
});

window.addEventListener('hashchange', initFromHash);
initFromHash();
