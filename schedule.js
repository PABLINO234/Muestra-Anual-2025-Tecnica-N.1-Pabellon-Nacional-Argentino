/*
 schedule.js
 
 Controla el render del cronograma, los filtros y la interacción del UI.

 - Los datos del cronograma se deben mantener exclusivamente en `data/schedule.json`.
 - Filtros disponibles: 'informatica' y 'automotores'. Otros tipos (general, other, receso)
   se muestran siempre.
 - El estado de los filtros se persiste en localStorage (clave: 'muestra_activeFilters_v1').

 Notas:
 - Mantén las cadenas (time/activity) en el JSON limpias — la UI añade los chips visuales sin modificar los datos originales.
*/

// Nota: los datos del cronograma ya NO están embebidos en este archivo.
// Se deben colocar exclusivamente en `data/schedule.json`.
// `scheduleByDay` se inicializa vacío y se rellena por `loadScheduleData()`.
let scheduleByDay = {};

// Cargar JSON externo (data/schedule.json). Si falla, dejamos el cronograma vacío
async function loadScheduleData() {
  try {
    const res = await fetch('data/schedule.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    // validar y normalizar: debe ser un objeto donde cada clave (día) apunta a un array
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const normalized = {};
      Object.keys(json).forEach(k => {
        const n = Number(k);
        normalized[n] = Array.isArray(json[k]) ? json[k] : [];
      });
      scheduleByDay = normalized;
      console.info('schedule.js: datos cargados desde data/schedule.json');
      return;
    }
    throw new Error('Formato JSON inválido');
  } catch (err) {
    console.warn('schedule.js: no se pudo cargar data/schedule.json — cronograma vacío.', err);
    scheduleByDay = {};
  }
}

// --- fin reemplazo ---

// Mapear tipos a colores/gradientes (se aplican a la variable CSS --bar-color)
const typeColors = {
  informatica: 'linear-gradient(180deg,#00fff6 0%, #3ad6ff 100%)',   // neon cyan -> electric blue
  automotores: 'linear-gradient(180deg,#ff2d95 0%, #ff7ab3 100%)',   // neon magenta -> warm pink
  general: 'linear-gradient(180deg,#7a00ff 0%, #b58cff 100%)',       // electric purple
  other: 'linear-gradient(180deg,#5b6b7a 0%, #7e8fa0 100%)',         // cool gray-blue
  receso: 'linear-gradient(180deg,#12324a 0%, #1b4b63 100%)'         // dark teal
};

// estado seleccionado (día) + persistencia
let selectedDay = 13;
const DAY_KEY = 'muestra_selectedDay_v1';
function saveSelectedDay(){ try{ localStorage.setItem(DAY_KEY, String(selectedDay)); }catch(e){} }
function loadSelectedDay(){ try{ const s = localStorage.getItem(DAY_KEY); if (s) selectedDay = Number(s); }catch(e){} }

function renderSchedule(filters = null) {
  const container = document.getElementById('schedule');
  if (!container) return;
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'grid-row header';
  header.setAttribute('role', 'listitem');
  header.innerHTML = `<div class="hora">Hora</div><div class="actividad">Actividad</div>`;
  container.appendChild(header);
  // asegurar que el encabezado sea visible (no quede con opacity:0)
  header.classList.add('visible');

  // Nuevo: sacamos los items del día seleccionado
  const dayItems = Array.isArray(scheduleByDay[selectedDay]) ? scheduleByDay[selectedDay] : [];
  // Asegurar que 'filters' sea un Set válido (si no se pasa, usamos todos los filtros por defecto)
  if (!filters || !(filters instanceof Set)) filters = new Set(typeof FILTER_TYPES !== 'undefined' ? FILTER_TYPES.slice() : []);

  const filtered = dayItems.filter(s => {
    if (s.type === 'receso') return true;
    if (s.type === 'informatica' || s.type === 'automotores') return filters.size === 0 ? true : filters.has(s.type);
    return true;
  });

  // Use DocumentFragment for one reflow + prepare rows for IO
  const frag = document.createDocumentFragment();
  const rowsToObserve = [];
  let visibleIndex = 0;

  filtered.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'grid-row pre-anim';
    row.setAttribute('role', 'listitem');
    if (item.type === 'receso') row.classList.add('receso');

    const barColor = typeColors[item.type] || typeColors.other;
    row.style.setProperty('--bar-color', barColor);
    row.classList.add(`type-${item.type}`);

  // Stagger más rápido y con tope para no demorar demasiado cuando hay muchas filas
  const rawDelay = visibleIndex * 0.04 + 0.02; // antes 0.08 + 0.04
  const capped = Math.min(rawDelay, 0.5);
  row.style.setProperty('--delay', capped.toFixed(2) + 's');

    const hora = document.createElement('div');
    hora.className = 'hora';
    hora.textContent = item.time;

    const actividad = document.createElement('div');
    actividad.className = 'actividad';
    actividad.textContent = item.activity;

    row.dataset.time = item.time;
    row.dataset.activity = item.activity;

    if (item.type !== 'receso') {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = item.type === 'informatica' ? 'Informática' : (item.type === 'automotores' ? 'Automotor' : '');
      chip.style.background = barColor;
      chip.style.color = '#020117';
      actividad.appendChild(chip);
    }

    row.appendChild(hora);
    row.appendChild(actividad);
    frag.appendChild(row);
    rowsToObserve.push(row);
    visibleIndex++;
  });

  container.appendChild(frag);

  // IntersectionObserver para activar la animación solo cuando la fila entra en viewport
  if ('IntersectionObserver' in window) {
    if (!window.__scheduleObserver) {
      window.__scheduleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // add visible -> CSS lanza la animación (stagger via --delay)
            entry.target.classList.add('visible');
            window.__scheduleObserver.unobserve(entry.target);
          }
        });
      }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    rowsToObserve.forEach(r => window.__scheduleObserver.observe(r));
  } else {
    // Fallback: activar todas inmediatamente
    rowsToObserve.forEach(r => r.classList.add('visible'));
  }

  if (typeof updateCounter === 'function') updateCounter();
}

// Filtrado interactivo: solo dos categorías visibles para filtros: informatica y automotores
const FILTER_TYPES = ['informatica', 'automotores'];

// Estado de filtros (por defecto ambos activos)
const activeFilters = new Set(FILTER_TYPES.slice());

// Persistencia en localStorage
const STORAGE_KEY = 'muestra_activeFilters_v1';
function saveActiveFilters(){
  try{
    const arr = [...activeFilters];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }catch(e){ /* no critical */ }
}
function loadActiveFilters(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return false;
    // reset and restore only known filter types
    activeFilters.clear();
    arr.forEach(t => { if (FILTER_TYPES.includes(t)) activeFilters.add(t); });
    // if nothing valid, restore defaults
    if (activeFilters.size === 0) FILTER_TYPES.forEach(t => activeFilters.add(t));
    return true;
  }catch(e){ return false; }
}


function renderFilters() {
  const container = document.getElementById('filters');
  if (!container) return;
  container.innerHTML = '';

  // Day selector (13 / 14)
  const dayWrap = document.createElement('div');
  dayWrap.className = 'day-selector';
  dayWrap.setAttribute('role', 'tablist');
  dayWrap.innerHTML = `<button class="day-btn" data-day="13" type="button">13 Nov</button><button class="day-btn" data-day="14" type="button">14 Nov</button>`;
  container.appendChild(dayWrap);

  function updateDayUI(){
    const btns = container.querySelectorAll('.day-btn');
    btns.forEach(b => {
      const d = Number(b.dataset.day);
      b.setAttribute('aria-pressed', selectedDay === d ? 'true' : 'false');
      b.classList.toggle('active', selectedDay === d);
    });
  }

  dayWrap.querySelectorAll('.day-btn').forEach(b => {
    b.addEventListener('click', () => {
      const day = Number(b.dataset.day);
      if (day === selectedDay) return;
      selectedDay = day;
      saveSelectedDay();
      updateDayUI();
      renderSchedule(activeFilters);
      updateCounter();
    });
  });

  // Contador de visibles
  const counter = document.createElement('div');
  counter.className = 'filter-counter';
  counter.setAttribute('aria-live','polite');
  counter.textContent = '';
  container.appendChild(counter);

  // Botón 'Todos' (toggle)
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'filter-btn all';
  allBtn.textContent = 'Todos';
  allBtn.addEventListener('click', () => {
    const allActive = FILTER_TYPES.every(t => activeFilters.has(t));
    activeFilters.clear();
    if (!allActive) FILTER_TYPES.forEach(t => activeFilters.add(t));
    updateFiltersUI();
    saveActiveFilters();
    renderSchedule(activeFilters);
  });
  container.appendChild(allBtn);

  // Botones por las dos categorías
  FILTER_TYPES.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = t === 'informatica' ? 'Informática' : 'Automotor';
    btn.dataset.type = t;
    btn.addEventListener('click', () => {
      if (activeFilters.has(t)) activeFilters.delete(t); else activeFilters.add(t);
      updateFiltersUI();
      saveActiveFilters();
      renderSchedule(activeFilters);
    });
    container.appendChild(btn);
  });

  // (sin funcionalidad de QR en esta versión)

  // Inicializar day UI y filtros
  loadSelectedDay();
  updateDayUI();
  updateFiltersUI();
  updateCounter();
}

function updateFiltersUI(){
  const container = document.getElementById('filters');
  if (!container) return;
  const btns = container.querySelectorAll('.filter-btn');
  btns.forEach(b => {
    const type = b.dataset.type;
    if (!type) return;
    b.setAttribute('aria-pressed', activeFilters.has(type) ? 'true' : 'false');
    b.classList.toggle('active', activeFilters.has(type));
  });
}

function updateCounter(){
  const cnt = document.querySelector('.filter-counter');
  if (!cnt) return;
  // Count visible (renderSchedule will be called after changing filters, so we compute from DOM)
  const container = document.getElementById('schedule');
  if (!container) { cnt.textContent = ''; return; }
  const rows = container.querySelectorAll('.grid-row');
  // subtract header
  const visible = Math.max(0, rows.length - 1);
  cnt.textContent = `${visible} actividad${visible === 1 ? '' : 'es'}`;
}

// (sin funcionalidad de QR en esta versión)

// --- Inicialización: cargar JSON antes de renderizar filtros/cronograma ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    loadActiveFilters();
    await loadScheduleData();
    renderFilters();
    renderSchedule(activeFilters);
    updateCounter();
  });
} else {
  (async () => {
    loadActiveFilters();
    await loadScheduleData();
    renderFilters();
    renderSchedule(activeFilters);
    updateCounter();
  })();
}

(function initParallax(){
  const right = document.querySelector('.right');
  const layers = {
    content: document.querySelector('.right .content'),
    overlay: document.querySelector('.right .overlay')
  };
  if (!right || !layers.content) return;
  let raf = null;
  right.addEventListener('mousemove', e => {
    if (raf) cancelAnimationFrame(raf);
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    raf = requestAnimationFrame(() => {
      layers.content.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
      layers.overlay.style.transform = `translate(${-x * 20}px, ${-y * 20}px)`;
    });
  });
})();

// Minimal particle system (low-cost, reactive to mouse)
(function initParticles(){
  const canvas = document.getElementById('particles');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, particles = [], mouse = { x: -9999, y: -9999 };
  function resize(){
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = Math.max(1, Math.floor(rect.width));
    h = canvas.height = Math.max(1, Math.floor(rect.height));
    // Capear partículas para evitar carga excesiva en dispositivos lentos
    const maxParticles = 60;
    const count = Math.min(maxParticles, Math.max(6, Math.round((w * h) / 120000)));
    particles = Array.from({length: count}, () => ({
      x: Math.random()*w,
      y: Math.random()*h,
      // velocidades reducidas para menos trabajo y movimiento más sutil
      vx: (Math.random()-0.5)/60,
      vy: (Math.random()-0.5)/60,
      r: 1 + Math.random()*2
    }));
  }
  function step(){
    // Si la pestaña está oculta, evitamos hacer el render pesado
    if (typeof document !== 'undefined' && document.hidden) {
      requestAnimationFrame(step);
      return;
    }
    ctx.clearRect(0,0,w,h);
    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      // repulsión del mouse (ligeramente más suave)
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist < 120){
        const force = (120 - dist) / 120;
        p.vx += (dx / dist) * 0.08 * force; // antes 0.18
        p.vy += (dy / dist) * 0.08 * force;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      // wrap
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
      // draw glow
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*8);
      g.addColorStop(0, 'rgba(122,0,255,0.12)');
      g.addColorStop(0.3, 'rgba(0,255,246,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r*4, 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }
  // pointer tracking
  function onMove(e){
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onLeave(){ mouse.x = -9999; mouse.y = -9999; }
  window.addEventListener('resize', () => { resize(); });
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  // init
  resize();
  requestAnimationFrame(step);
})();

// add ripple on click for rows
document.addEventListener('click', (e) => {
  const row = e.target.closest('.grid-row');
  if (!row || row.classList.contains('header')) return;
  const rect = row.getBoundingClientRect();
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 1.2;
  r.style.width = r.style.height = size + 'px';
  r.style.left = (e.clientX - rect.left - size/2) + 'px';
  r.style.top = (e.clientY - rect.top - size/2) + 'px';
  r.style.background = 'radial-gradient(circle, rgba(255,255,255,0.12), rgba(122,0,255,0.06))';
  row.appendChild(r);
  requestAnimationFrame(()=> r.style.transform = 'scale(1) translateZ(0)');
  setTimeout(()=> r.remove(), 600);
});
