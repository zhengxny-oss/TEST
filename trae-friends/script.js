/* =========================================================
   TRAE Friends · small site interactions
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Config ----------
     REPLACE_ENDPOINT:
       Leave empty "" to simulate a successful submission locally.
       Or set to your own endpoint, e.g.:
         - Google Forms submissions via public form-action URL (method: GET)
         - 飞书多维表格 / Airtable / 自建后端 Webhook (method: POST)
       Example (POST JSON):  "https://hooks.example.com/trae-rsvp"
       Example (GET form):   "https://docs.google.com/forms/d/e/xxxxxx/formResponse"
  */
  const REPLACE_ENDPOINT = '';
  const SUBMIT_METHOD    = 'POST';          // 'POST' | 'GET'
  /* 若用 GET 提交 Google Forms，请把下面字段改成对应 entry.xxx */
  const GOOGLE_ENTRY_MAP = {
    name:    'entry.1111111111',
    email:   'entry.2222222222',
    wechat:  'entry.3333333333',
    role:    'entry.4444444444',
    topics:  'entry.5555555555',
    message: 'entry.6666666666',
    agree:   'entry.7777777777',
  };

  /* ---------- Countdown ---------- */
  const EVENT_DATE = new Date('2026-11-28T14:00:00+08:00').getTime();
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const diff = Math.max(0, EVENT_DATE - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = pad(v);
    };
    set('cd-d', d); set('cd-h', h); set('cd-m', m); set('cd-s', s);
  };
  tick();
  setInterval(tick, 1000);

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.section-head, .card, .guest, .timeline > li, .faq, .form-intro, .form');
  revealEls.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  /* ---------- Textarea counter ---------- */
  const ta = document.querySelector('#message');
  const count = document.querySelector('[data-count]');
  if (ta && count) {
    ta.addEventListener('input', () => count.textContent = ta.value.length);
  }

  /* ---------- Form validation + submit ---------- */
  const form = document.getElementById('rsvp');
  const toast = document.getElementById('toast');
  if (!form) return;

  const showErr = (name, msg) => {
    const input = form.elements[name];
    const el = form.querySelector(`.err[data-for="${name}"]`);
    if (input) {
      input.classList.toggle('invalid', !!msg);
      if (input.type === 'checkbox') {
        // handled below separately
      }
    }
    if (el) el.textContent = msg || '';
  };

  const validate = () => {
    let ok = true;
    const name  = form.name.value.trim();
    const email = form.email.value.trim();
    const role  = form.role.value;
    const agree = form.agree.checked;

    showErr('name', name.length < 2 ? '请填写姓名（至少 2 个字符）' : '');
    showErr('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '邮箱格式看起来不对' : '');
    showErr('role', !role ? '请选择你的身份' : '');
    showErr('agree', !agree ? '需要同意活动准则才能提交' : '');

    ok = name.length >= 2
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      && role
      && agree;
    return ok;
  };

  form.addEventListener('input', (e) => {
    if (e.target.name) showErr(e.target.name, '');
    if (e.target.name === 'agree') showErr('agree', e.target.checked ? '' : '需要同意活动准则才能提交');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const btn = form.querySelector('#submit');
    btn.classList.add('is-loading');

    const payload = {
      name:    form.name.value.trim(),
      email:   form.email.value.trim(),
      wechat:  form.wechat.value.trim(),
      role:    form.role.value,
      topics:  Array.from(form.querySelectorAll('input[name="topics"]:checked')).map(i => i.value),
      message: form.message.value.trim(),
      agree:   form.agree.checked,
      source:  'trae-friends-rsvp',
      ts:      new Date().toISOString(),
    };

    try {
      if (!REPLACE_ENDPOINT) {
        // 演示模式：本地模拟成功，并把记录写入 localStorage
        const list = JSON.parse(localStorage.getItem('trae_rsvp_list') || '[]');
        list.push(payload);
        localStorage.setItem('trae_rsvp_list', JSON.stringify(list));
        await new Promise(r => setTimeout(r, 700));
      } else if (SUBMIT_METHOD === 'POST') {
        const res = await fetch(REPLACE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } else {
        // GET：适用于 Google Forms 的 formResponse 端点
        const params = new URLSearchParams();
        Object.entries(GOOGLE_ENTRY_MAP).forEach(([k, entry]) => {
          const v = Array.isArray(payload[k]) ? payload[k].join(', ') : (payload[k] ?? '');
          if (v !== '') params.append(entry, v);
        });
        const img = new Image();
        img.src = `${REPLACE_ENDPOINT}?${params.toString()}`;
        await new Promise(r => setTimeout(r, 600));
      }

      // Success
      btn.classList.remove('is-loading');
      form.reset();
      if (count) count.textContent = 0;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3800);
    } catch (err) {
      btn.classList.remove('is-loading');
      alert('提交失败，请稍后重试或发邮件到 friends@trae.ai');
      console.error('[TRAE Friends] submit failed:', err);
    }
  });

})();
