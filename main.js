// ─── Light/Dark Mode ──────────────────────────────────────────
const toggle = document.getElementById('themeToggle');
const icon   = toggle.querySelector('.theme-toggle-icon');
const root   = document.documentElement;

const apply = theme => {
    root.setAttribute('data-theme', theme);
    icon.textContent = theme === 'dark' ? '☾' : '☀︎';
    localStorage.setItem('theme', theme);
};

apply(localStorage.getItem('theme') || 'light');

toggle.addEventListener('click', () => {
    apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});


// ─── Loader ──────────────────────────────────────────────────
(function () {
    const pctEl  = document.getElementById('ldPct');
    const loader = document.getElementById('loader');
    if (!pctEl || !loader) return;
 
    const start    = performance.now();
    const duration = 5000;
 
    function tick(now) {
        const p     = Math.min((now - start) / duration, 1);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        pctEl.textContent = Math.round(eased * 100) + '%';
        if (p < 1) requestAnimationFrame(tick);
    }
 
    requestAnimationFrame(tick);
 
    loader.addEventListener('animationend', e => {
        if (e.animationName === 'ldFadeOut') loader.remove();
    });
})();


// ─── Sound Effects ───────────────────────────────────────────
const HOVER_SOUND = 'tingog/hover.flac';  
const CLICK_SOUND = 'tingog/click.mp3';   

(function () {

    const hoverAudio = new Audio(HOVER_SOUND);
    const clickAudio = new Audio(CLICK_SOUND);

    hoverAudio.volume = 0.5;   
    clickAudio.volume = 0.7;   

    function play(audio) {
        const instance = audio.cloneNode();
        instance.volume = audio.volume;
        instance.play().catch(() => {});  
    }

    const HOVER_SELECTOR = 'a, button, [role="button"], tbody tr, article';
    const CLICK_SELECTOR = 'a, button, [role="button"]';

    let lastHover = 0;

    document.addEventListener('mouseover', e => {
        const el = e.target.closest(HOVER_SELECTOR);
        if (!el) return;
        const now = Date.now();
        if (now - lastHover < 80) return; 
        lastHover = now;
        play(hoverAudio);
    });

    document.addEventListener('mousedown', e => {
        const el = e.target.closest(CLICK_SELECTOR);
        if (!el) return;
        play(clickAudio);
    });

})();

(function () {
    const SOUND_SRC = 'tingog/quick_action.mp3';
    const VOLUME    = 0.7;

    const audio = new Audio(SOUND_SRC);
    audio.volume = VOLUME;

    document.querySelector('.quickAct-sec').addEventListener('mousedown', e => {
        if (!e.target.closest('.button')) return;
        const instance = audio.cloneNode();
        instance.volume = VOLUME;
        instance.play().catch(() => {});
    });
})();


// ─── Vital Sign Sparkline Charts ──────────────────────────────
(function () {

    const POINTS        = 48;    // number of data points (6h window)
    const ANIM_DURATION = 2000;  // ms — how long the rise-from-zero animation takes
    const WAVE_WIDTH    = 10;    // how many points wide the sweeping wave front is

    const VITALS = [
        { id: 'hr',   unit: 'bpm', decimals: 0, mean: 72,   noise: 4,    min: 50,   max: 100  },
        { id: 'o2',   unit: '%',   decimals: 1, mean: 98,   noise: 0.5,  min: 94,   max: 100  },
        { id: 'bp',   unit: 'mmHg',decimals: 0, mean: 120,  noise: 5,    min: 100,  max: 140  },
        { id: 'temp', unit: '°C',  decimals: 1, mean: 37.1, noise: 0.12, min: 36.5, max: 38   },
    ];

    const CSS_VARS = { hr: '--vital-hr', o2: '--vital-o2', bp: '--vital-bp', temp: '--vital-temp' };

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function generateData(mean, noise, n) {
        let v = mean;
        return Array.from({ length: n }, () => {
            v += (Math.random() - 0.5) * noise * 2;
            v  = Math.max(mean - noise * 3, Math.min(mean + noise * 3, v));
            v += (mean - v) * 0.08;   
            return v;
        });
    }

    function draw(canvas, vital, data, progress) {
        const W   = canvas.width;
        const H   = canvas.height;
        const ctx = canvas.getContext('2d');
        const { id, unit, decimals, min, max } = vital;
        const N   = data.length;
        const PAD = 6;

        const color     = cssVar(CSS_VARS[id]);
        const [r, g, b] = hexToRgb(color);
        const range     = max - min;

        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = cssVar('--border');
        ctx.lineWidth   = 0.5;
        [0.25, 0.5, 0.75].forEach(frac => {
            const y = Math.round(H * frac) + 0.5;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        });

        const norms = data.map((v, i) => {
            const localP = easeOutCubic(
                Math.min(1, Math.max(0, (progress * (N + WAVE_WIDTH) - i) / WAVE_WIDTH))
            );
            return ((v - min) / range) * localP;
        });

        const toX = i => (i / (N - 1)) * W;
        const toY = n => H - PAD - n * (H - PAD * 2);

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.18)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.moveTo(toX(0), H);
        norms.forEach((n, i) => ctx.lineTo(toX(i), toY(n)));
        ctx.lineTo(toX(N - 1), H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.lineJoin    = 'round';
        ctx.lineCap     = 'round';
        norms.forEach((n, i) => {
            i === 0 ? ctx.moveTo(toX(i), toY(n)) : ctx.lineTo(toX(i), toY(n));
        });
        ctx.stroke();

        if (progress > 0.85) {
            const alpha = Math.min(1, (progress - 0.85) / 0.15);
            const ex    = toX(N - 1);
            const ey    = toY(norms[N - 1]);

            ctx.beginPath();
            ctx.arc(ex, ey, 3 + (1 - alpha) * 7, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.25})`;
            ctx.lineWidth   = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fill();
        }

        const valEl = document.getElementById(`cval-${id}`);
        if (valEl) {
            const displayVal = data[N - 1] * easeOutCubic(Math.min(1, progress * 1.1));
            valEl.textContent = `${displayVal.toFixed(decimals)} ${unit}`;
        }
    }


    // ── Boot ───────────────────────────────────────────────────
    const CARD_IDS = { hr: 'vital-hr', o2: 'vital-o2', bp: 'vital-bp', temp: 'vital-temp' };

    function getCanvas(v) {
        const card = document.getElementById(CARD_IDS[v.id]);
        return card ? card.querySelector('.graph-canvas') : null;
    }

    function init() {
        const datasets = {};
        VITALS.forEach(v => { datasets[v.id] = generateData(v.mean, v.noise, POINTS); });

        function sizeCanvases() {
            VITALS.forEach(v => {
                const c = getCanvas(v);
                if (c) c.width = c.offsetWidth || c.parentElement.offsetWidth || 320;
            });
        }

        sizeCanvases();

        const start = performance.now();

        (function frame(now) {
            const p = Math.min(1, (now - start) / ANIM_DURATION);
            VITALS.forEach(vital => {
                const c = getCanvas(vital);
                if (c) draw(c, vital, datasets[vital.id], p);
            });
            if (p < 1) requestAnimationFrame(frame);
        })(start);

        window.addEventListener('resize', () => {
            sizeCanvases();
            VITALS.forEach(vital => {
                const c = getCanvas(vital);
                if (c) draw(c, vital, datasets[vital.id], 1);
            });
        });
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();


// ─── Quick-Action Popup Modal ──────────────────────────────
(function () {

    const ACTIONS = {
        'btn-nurse': {
            type:  'nurse',
            icon:  '🚨',
            title: 'Nurse Assist Requested',
            body:  'A stat nurse assist has been dispatched to CCU-NORTH-04. Estimated response time: under 2 minutes. Please remain with the patient.',
        },
        'btn-report': {
            type:  'report',
            icon:  '📄',
            title: 'Generating Trend Report',
            body:  'Your 24-hour trend report is being compiled from the active telemetry feed. The PDF will download automatically once ready.',
        },
        'btn-telem': {
            type:  'telem',
            icon:  '📡',
            title: 'Telemetry Stream Active',
            body:  'Live waveform data is now streaming for CCU-NORTH-04. All sensor feeds are transmitting to the central monitoring station.',
        },
        'btn-chart': {
            type:  'chart',
            icon:  '📝',
            title: 'Patient Chart Updated',
            body:  'All changes have been saved to Patient J. Doe\'s record and time-stamped. The attending physician has been notified.',
        },
    };

    const overlay  = document.getElementById('qa-modal');
    const iconEl   = document.getElementById('qa-modal-icon');
    const titleEl  = document.getElementById('qa-modal-title');
    const bodyEl   = document.getElementById('qa-modal-body');
    const closeBtn = document.getElementById('qa-modal-close');

    const btns = document.querySelectorAll('.quickAct-sec .button');
    const keys  = Object.keys(ACTIONS);
    btns.forEach((btn, i) => { if (keys[i]) btn.dataset.qaId = keys[i]; });

    function openModal(id) {
        const cfg = ACTIONS[id];
        if (!cfg) return;
        iconEl.textContent    = cfg.icon;
        iconEl.dataset.type   = cfg.type;
        titleEl.textContent   = cfg.title;
        bodyEl.textContent    = cfg.body;
        overlay.classList.add('is-open');
        closeBtn.focus();
    }

    function closeModal() {
        overlay.classList.remove('is-open');
    }

    document.querySelector('.quickAct-sec').addEventListener('click', e => {
        const btn = e.target.closest('[data-qa-id]');
        if (!btn) return;
        e.preventDefault();
        openModal(btn.dataset.qaId);
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
    });

})();

