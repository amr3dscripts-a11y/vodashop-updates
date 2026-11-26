function vsInit(root) {
  try { vsSim(root); } catch (e) {}
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var counted = new WeakSet();
  function count(el) {
    if (counted.has(el)) return; counted.add(el);
    var to = +el.getAttribute('data-count'), suf = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = fmt(to) + suf; return; }
    var t0 = performance.now(), d = 1300;
    (function step(t) {
      var p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(to * e)) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  var host = root.querySelector ? (root.querySelector('.lp') || root) : root;
  if (host.classList) host.classList.add('js');
  var els = root.querySelectorAll('.rv, .win, [data-count]');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return function () {};
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.hasAttribute('data-count')) count(e.target);
      e.target.querySelectorAll && e.target.querySelectorAll('[data-count]').forEach(count);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  els.forEach(function (el) { io.observe(el); });
  return function () { io.disconnect(); };
}

function vsSim(root) {
  var q = function (id) { return root.querySelector(id); };
  var box = q('#sim'); if (!box) return;
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var MAXB = 100000, FEE = 1;
  var L = [
    { n: 'خط الأمل 1', bal: 30000, iu: 40000, il: 100000, ou: 20000, ol: 100000 },
    { n: 'خط الأمل 2', bal: 50000, iu: 70000, il: 100000, ou: 45000, ol: 100000 },
    { n: 'خط الأمل 3', bal: 80000, iu: 10000, il: 100000, ou: 5000, ol: 100000 }
  ];
  var type = 'in', sel = -1, comTouched = false, log = [];
  var amt = q('#sim-amt'), com = q('#sim-com'), err = q('#sim-err'), ok = q('#sim-ok');
  function can(l, a) {
    return type === 'in' ? (l.il - l.iu >= a && l.bal + a <= MAXB) : (l.ol - l.ou >= a && l.bal >= a + FEE);
  }
  function amount() { var a = parseInt(amt.value, 10); return a > 0 ? a : 0; }
  function minCom(a) { return type === 'in' ? Math.floor((a + 50) / 100) : 0; }
  function color(r) { return r >= 0.8 ? '#f87171' : r >= 0.5 ? '#f5b82e' : '#2fbf8f'; }
  function bars() {
    q('#sim-bars').innerHTML = L.map(function (l, i) {
      var ri = l.iu / l.il, ro = l.ou / l.ol;
      var row = function (lab, u, lim, r) {
        return '<div class="bt"><span>' + lab + '</span><span>' + Math.round(r * 100) + '%' + (r >= 0.8 ? ' ⚠ تنبيه' : '') + '</span></div><div class="tr"><i style="width:' + Math.min(100, r * 100) + '%;background:' + color(r) + '"></i></div><small>استُخدم ' + fmt(u) + ' من ' + fmt(lim) + '</small>';
      };
      return '<div class="sbar"><b>' + l.n + '</b> <small>(الرصيد ' + fmt(l.bal) + ' ج)</small>' + row('وارد', l.iu, l.il, ri) + row('صادر', l.ou, l.ol, ro) + '</div>';
    }).join('');
  }
  function lines() {
    var a = amount(), host = q('#sim-lines'), any = false;
    if (sel >= 0 && !(a && can(L[sel], a))) sel = -1;
    host.innerHTML = '';
    L.forEach(function (l, i) {
      if (a && !can(l, a)) return;
      any = true;
      var rem = type === 'in' ? l.il - l.iu : l.ol - l.ou;
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'sl' + (i === sel ? ' on' : '');
      b.innerHTML = '<span>' + l.n + '<small>' + (type === 'in' ? 'متبقي وارد هذا الشهر' : 'متبقي صادر هذا الشهر') + '</small></span><b>' + fmt(rem) + ' ج</b>';
      b.onclick = function () { sel = i; update(); };
      host.appendChild(b);
    });
    if (a && !any) host.innerHTML = '<div class="err">لا يوجد أي خط يستطيع تنفيذ هذا المبلغ</div>';
    if (!a) host.innerHTML = '<div class="muted">اكتب المبلغ أولا</div>';
  }
  function summary() {
    var a = amount(), c = parseInt(com.value, 10); if (!(c >= 0)) c = 0;
    var e = '';
    if (a && c < minCom(a)) e = 'عمولة الوارد إجبارية (الحد الأدنى ' + minCom(a) + ' جنيه)';
    else if (type === 'in' && c > a) e = 'العمولة أكبر من المبلغ';
    err.textContent = e;
    var ready = a > 0 && sel >= 0 && !e;
    ok.disabled = !ready;
    q('#sim-cash').textContent = ready ? (type === 'in' ? '−' + fmt(a - c) + ' (سلّم العميل)' : '+' + fmt(a + c) + ' (استلم من العميل)') : '—';
    q('#sim-wal').textContent = ready ? (type === 'in' ? '+' + fmt(a) : '−' + fmt(a + FEE) + ' (شامل رسوم ' + FEE + ')') : '—';
    q('#sim-pro').textContent = ready ? fmt(type === 'in' ? c : c - FEE) + ' ج' : '—';
  }
  function update() { lines(); summary(); }
  function setCom() {
    var a = amount();
    com.value = a ? (type === 'in' ? minCom(a) : Math.floor((a + 50) / 100)) : '';
    q('#sim-cm-hint').textContent = type === 'in' ? '(إجبارية، 1% كحد أدنى، تُزاد فقط)' : '(اختيارية)';
  }
  box.querySelectorAll('.seg button').forEach(function (b) {
    b.onclick = function () {
      box.querySelectorAll('.seg button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); type = b.getAttribute('data-t'); sel = -1; setCom(); update();
    };
  });
  box.querySelectorAll('.chips2 button').forEach(function (b) {
    b.onclick = function () { amt.value = b.getAttribute('data-v'); setCom(); update(); };
  });
  amt.oninput = function () { setCom(); update(); };
  com.oninput = summary;
  ok.onclick = function () {
    var a = amount(), c = parseInt(com.value, 10) || 0, l = L[sel];
    if (!l || ok.disabled) return;
    if (type === 'in') { l.iu += a; l.bal += a; } else { l.ou += a; l.bal -= a + FEE; }
    log.unshift({ t: type, a: a, n: l.n, time: new Date() });
    log = log.slice(0, 4);
    var m = q('#sim-msg'); m.className = 'toast ok';
    m.textContent = 'تم تسجيل عملية ' + (type === 'in' ? 'وارد' : 'صادر') + ' بمبلغ ' + fmt(a) + ' على ' + l.n;
    q('#sim-log').innerHTML = log.map(function (x) {
      var hh = ('0' + x.time.getHours()).slice(-2) + ':' + ('0' + x.time.getMinutes()).slice(-2);
      return '<div class="li ' + x.t + '"><span>' + (x.t === 'in' ? '↓ وارد' : '↑ صادر') + ' ' + fmt(x.a) + ' ج</span><span>' + x.n + '</span><span class="muted">' + hh + '</span></div>';
    }).join('');
    sel = -1; bars(); setCom(); update();
  };
  bars(); setCom(); update();
}
