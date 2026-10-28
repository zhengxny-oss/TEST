(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- navigation ---------------- */
  var nav = $('#nav');
  var mobileCta = $('#mobileCta');
  var ctaTimer = null;
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 16);
      syncMobileCta();
      ticking = false;
    });
  }

  function syncMobileCta() {
    var show = window.scrollY > 700 && !$('#applyDialog').open;
    window.clearTimeout(ctaTimer);
    if (show) {
      mobileCta.hidden = false;
      window.requestAnimationFrame(function () { mobileCta.classList.add('is-visible'); });
    } else {
      mobileCta.classList.remove('is-visible');
      ctaTimer = window.setTimeout(function () { mobileCta.hidden = true; }, 320);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- scroll reveal ---------------- */
  var revealItems = $$('[data-reveal]');
  if (!reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px' });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- countdown ---------------- */
  var DEADLINE = new Date('2026-11-15T23:59:59+08:00');
  var cdBox = $('#countdown');
  var cdD = $('#cdDays'), cdH = $('#cdHours'), cdM = $('#cdMins'), cdS = $('#cdSecs');

  function pad(n) { return String(n).padStart(2, '0'); }

  function tickCountdown() {
    var diff = DEADLINE.getTime() - Date.now();
    if (diff <= 0) {
      cdBox.classList.add('is-over');
      cdBox.innerHTML = '<span class="cd-label">本期报名已截止，关注下一期招募</span>';
      window.clearInterval(cdTimer);
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    cdD.textContent = pad(days);
    cdH.textContent = pad(hours);
    cdM.textContent = pad(mins);
    cdS.textContent = pad(secs);
  }
  var cdTimer = window.setInterval(tickCountdown, 1000);
  tickCountdown();

  /* ---------------- faq ---------------- */
  $$('.faq-q').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
  });

  /* ---------------- dialog ---------------- */
  var dialog = $('#applyDialog');
  var dialogBody = $('#dialogBody');
  var form = $('#signupForm');
  var success = $('#success');
  var progressWrap = $('#progressWrap');
  var submitting = false;

  function openDialog() {
    if (!dialog.open) {
      document.body.classList.add('dialog-open');
      dialog.showModal();
      restoreDraft();
      syncMobileCta();
      dialogBody.scrollTop = 0;
    }
  }

  function closeDialog() {
    if (!dialog.open || submitting) return;
    dialog.close();
  }

  $$('[data-open-form]').forEach(function (btn) {
    btn.addEventListener('click', openDialog);
  });

  $('#dialogClose').addEventListener('click', closeDialog);

  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) closeDialog();
  });

  dialog.addEventListener('cancel', function (e) {
    if (submitting) e.preventDefault();
  });

  dialog.addEventListener('close', function () {
    document.body.classList.remove('dialog-open');
    resetDialog();
    syncMobileCta();
  });

  /* ---------------- form state ---------------- */
  var stepEls = [1, 2, 3].map(function (n) { return $('#step-' + n); });
  var stepperItems = $$('#stepper li');
  var prevBtn = $('#prevBtn');
  var nextBtn = $('#nextBtn');
  var submitBtn = $('#submitBtn');
  var progressBar = $('#progressBar');
  var formMeta = $('#formMeta');
  var currentStep = 1;

  stepEls.forEach(function (el) { el.tabIndex = -1; });

  var STEP_FIELDS = {
    1: ['name', 'city', 'phone', 'email'],
    2: ['identity', 'track', 'hours', 'direction', 'portfolio'],
    3: ['intro', 'goal', 'agree']
  };

  var VALIDATORS = {
    name: function (v) {
      if (!v) return '请填写你的姓名';
      if (v.length < 2) return '姓名至少 2 个字';
      if (v.length > 20) return '姓名最多 20 个字';
      return '';
    },
    city: function (v) { return v ? '' : '请选择所在城市'; },
    phone: function (v) {
      if (!v) return '请填写手机号';
      return /^1[3-9]\d{9}$/.test(v) ? '' : '手机号格式不对，请填 11 位中国大陆号码';
    },
    email: function (v) {
      if (!v) return '请填写邮箱，我们会用它通知结果';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : '邮箱格式不对，例如 name@example.com';
    },
    identity: function (v) { return v ? '' : '请选择你目前的身份'; },
    track: function (v) {
      if (!v) return '请填写你的主要方向';
      return v.length >= 2 ? '' : '至少 2 个字，例如「前端开发」';
    },
    hours: function (v) { return v ? '' : '请选择每周可投入的时间'; },
    direction: function (v) {
      if (!v.length) return '至少选择一个方向';
      return v.length > 2 ? '最多选择 2 个方向' : '';
    },
    portfolio: function (v) {
      if (!v) return '';
      return /^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}([/?#]\S*)?$/.test(v)
        ? '' : '链接格式不对，请检查后重试，例如 github.com/yourname';
    },
    intro: function (v) {
      if (v.length < 20) return '再写 ' + (20 - v.length) + ' 个字，让我们更了解你';
      return '';
    },
    goal: function (v) {
      if (v.length < 10) return '再多写一点，至少 10 个字';
      return '';
    },
    agree: function (v) { return v ? '' : '需要同意报名须知与隐私说明才能提交'; }
  };

  function getValues() {
    var identity = form.querySelector('input[name="identity"]:checked');
    var hours = form.querySelector('input[name="hours"]:checked');
    return {
      name: $('#f-name').value.trim(),
      city: $('#f-city').value,
      phone: $('#f-phone').value.trim(),
      email: $('#f-email').value.trim(),
      identity: identity ? identity.value : '',
      track: $('#f-track').value.trim(),
      hours: hours ? hours.value : '',
      direction: $$('input[name="direction"]:checked').map(function (i) { return i.value; }),
      portfolio: $('#f-portfolio').value.trim(),
      intro: $('#f-intro').value.trim(),
      goal: $('#f-goal').value.trim(),
      agree: $('#f-agree').checked,
      news: $('#f-news').checked
    };
  }

  function setFieldError(name, message) {
    var err = $('#err-' + name);
    if (err) err.textContent = message;
    var control = form.elements.namedItem(name);
    if (!control) return;
    var list = typeof RadioNodeList !== 'undefined' && control instanceof RadioNodeList
      ? Array.prototype.slice.call(control) : [control];
    list.forEach(function (node) {
      if (node.setAttribute) node.setAttribute('aria-invalid', message ? 'true' : 'false');
    });
  }

  function validateField(name, values) {
    var v = values || getValues();
    var msg = VALIDATORS[name] ? VALIDATORS[name](v[name]) : '';
    setFieldError(name, msg);
    return msg === '';
  }

  function validateStep(step) {
    var values = getValues();
    var firstBad = null;
    STEP_FIELDS[step].forEach(function (name) {
      if (!validateField(name, values) && !firstBad) firstBad = name;
    });
    return firstBad;
  }

  function focusField(name) {
    var control = form.elements.namedItem(name);
    var node = typeof RadioNodeList !== 'undefined' && control instanceof RadioNodeList
      ? control[0] : control;
    if (!node) return;
    node.focus({ preventScroll: true });
    if (node.scrollIntoView) {
      node.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function showStep(n) {
    currentStep = n;
    stepEls.forEach(function (el) {
      el.hidden = Number(el.dataset.step) !== n;
    });
    stepperItems.forEach(function (li) {
      var i = Number(li.dataset.step);
      li.classList.toggle('is-current', i === n);
      li.classList.toggle('is-done', i < n);
      if (i === n) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    progressBar.style.width = (n / 3) * 100 + '%';
    prevBtn.hidden = n === 1;
    nextBtn.hidden = n === 3;
    submitBtn.hidden = n !== 3;
    formMeta.textContent = '第 ' + n + ' 步，共 3 步';
    dialogBody.scrollTop = 0;
    stepEls[n - 1].focus({ preventScroll: true });
  }

  function goNext() {
    if (currentStep < 3) {
      var bad = validateStep(currentStep);
      if (bad) { focusField(bad); return; }
      showStep(currentStep + 1);
    }
  }

  function goPrev() {
    if (currentStep > 1) showStep(currentStep - 1);
  }

  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  /* ---------------- validation wiring ---------------- */
  form.addEventListener('focusout', function (e) {
    var name = e.target.name;
    if (!name || name === 'news') return;
    if (e.target.type === 'radio' || e.target.type === 'checkbox') return;
    validateField(name);
    saveDraftSoon();
  });

  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.name === 'phone') {
      var clean = t.value.replace(/\D/g, '').slice(0, 11);
      if (t.value !== clean) t.value = clean;
    }
    if (t.id === 'f-intro') $('#counter-intro').textContent = t.value.length + ' / 160';
    if (t.id === 'f-goal') $('#counter-goal').textContent = t.value.length + ' / 200';
    saveDraftSoon();
  });

  form.addEventListener('change', function (e) {
    var name = e.target.name;
    if (!name) return;
    if (name === 'direction' && e.target.checked) limitDirections(e.target);
    if (VALIDATORS[name]) validateField(name);
    saveDraftSoon();
  });

  var dirTimer = null;
  function limitDirections(target) {
    var checked = $$('input[name="direction"]:checked');
    var hint = $('#directionHint');
    if (checked.length > 2) {
      target.checked = false;
      hint.textContent = '最多选 2 个方向，先取消一个再选。';
      hint.classList.add('is-warn');
      window.clearTimeout(dirTimer);
      dirTimer = window.setTimeout(function () {
        hint.textContent = '不确定就选你最想做的那个，剩下的交给我们判断。';
        hint.classList.remove('is-warn');
      }, 2600);
    }
  }

  /* ---------------- draft ---------------- */
  var DRAFT_KEY = 'trae-friends-draft-v1';
  var draftTimer = null;

  function saveDraftSoon() {
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: getValues(), at: Date.now() }));
      } catch (err) { /* storage unavailable */ }
    }, 400);
  }

  function restoreDraft() {
    var raw;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (err) { return; }
    if (!raw) return;
    var v;
    try { v = JSON.parse(raw).v; } catch (err) { return; }
    if (!v) return;

    if (v.name) $('#f-name').value = v.name;
    if (v.city) $('#f-city').value = v.city;
    if (v.phone) $('#f-phone').value = v.phone;
    if (v.email) $('#f-email').value = v.email;
    if (v.track) $('#f-track').value = v.track;
    if (v.portfolio) $('#f-portfolio').value = v.portfolio;
    if (v.intro) $('#f-intro').value = v.intro;
    if (v.goal) $('#f-goal').value = v.goal;

    if (v.identity) {
      var idRadio = form.querySelector('input[name="identity"][value="' + v.identity + '"]');
      if (idRadio) idRadio.checked = true;
    }
    if (v.hours) {
      var hRadio = form.querySelector('input[name="hours"][value="' + v.hours + '"]');
      if (hRadio) hRadio.checked = true;
    }
    if (Array.isArray(v.direction)) {
      $$('input[name="direction"]').forEach(function (box) {
        box.checked = v.direction.indexOf(box.value) !== -1;
      });
    }
    if (v.agree) $('#f-agree').checked = true;
    $('#f-news').checked = v.news !== false;

    $('#counter-intro').textContent = $('#f-intro').value.length + ' / 160';
    $('#counter-goal').textContent = $('#f-goal').value.length + ' / 200';
  }

  /* ---------------- submit ---------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;

    if (currentStep < 3) { goNext(); return; }

    var values = getValues();
    var firstBad = null;
    Object.keys(VALIDATORS).forEach(function (name) {
      if (!validateField(name, values) && !firstBad) firstBad = name;
    });

    if (firstBad) {
      var badStep = STEP_FIELDS[1].indexOf(firstBad) !== -1 ? 1
        : STEP_FIELDS[2].indexOf(firstBad) !== -1 ? 2 : 3;
      if (badStep !== currentStep) showStep(badStep);
      focusField(firstBad);
      return;
    }

    submitting = true;
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    nextBtn.disabled = true;
    submitBtn.querySelector('.btn-label').textContent = '提交中';

    window.setTimeout(function () {
      finishSubmit(values);
    }, 1100);
  });

  function finishSubmit(values) {
    var id = 'TF26-' + String(Math.floor(1000 + Math.random() * 9000));

    try {
      var key = 'trae-friends-applications';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      var record = { id: id, submittedAt: new Date().toISOString() };
      Object.keys(values).forEach(function (k) { record[k] = values[k]; });
      list.push(record);
      localStorage.setItem(key, JSON.stringify(list));
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) { /* ignore storage quota */ }

    submitting = false;
    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
    nextBtn.disabled = false;
    submitBtn.querySelector('.btn-label').textContent = '提交报名';

    $('#successEmail').textContent = values.email;
    $('#successId').textContent = id;
    $('#step-1').hidden = true;
    $('#step-2').hidden = true;
    $('#step-3').hidden = true;
    form.hidden = true;
    progressWrap.hidden = true;
    success.hidden = false;
    dialogBody.scrollTop = 0;
    $('#success h3').focus();
  }

  function resetDialog() {
    form.hidden = false;
    success.hidden = true;
    progressWrap.hidden = false;
    form.reset();
    Object.keys(VALIDATORS).forEach(function (name) { setFieldError(name, ''); });
    $('#counter-intro').textContent = '0 / 160';
    $('#counter-goal').textContent = '0 / 200';
    $('#directionHint').textContent = '不确定就选你最想做的那个，剩下的交给我们判断。';
    $('#directionHint').classList.remove('is-warn');
    showStep(1);
  }

  $('#successClose').addEventListener('click', closeDialog);
  $('#successRules').addEventListener('click', function (e) {
    e.preventDefault();
    closeDialog();
    window.setTimeout(function () {
      var target = $('#rules');
      if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }, 80);
  });

  $$('[data-close-to-rules]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      closeDialog();
      window.setTimeout(function () {
        var target = $('#rules');
        if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }, 80);
    });
  });

  /* ---------------- copy id ---------------- */
  var copyBtn = $('#copyId');
  copyBtn.addEventListener('click', function () {
    var text = $('#successId').textContent;
    var done = function () {
      copyBtn.textContent = '已复制';
      window.setTimeout(function () { copyBtn.textContent = '复制编号'; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {
        copyBtn.textContent = '请长按编号复制';
      }
      document.body.removeChild(ta);
    }
  });
})();
