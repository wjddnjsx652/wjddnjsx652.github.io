/* ==========================================================================
   경력 포트폴리오 — 화면 구성과 동작
   내용은 js/data.js 에서만 고치면 됩니다. 이 파일은 보통 수정할 필요가 없습니다.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.PORTFOLIO_DATA;
  if (!D) { document.body.textContent = 'js/data.js 를 불러오지 못했습니다.'; return; }

  /* ---------- 도구 ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; }); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');

  var state = { evidence: {}, previews: {}, admin: null, filter: 'all', cap: null, proj: null };

  var ICON = {
    plus: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 1v12M1 7h12"/></svg>',
    arrow: '<svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 9c5 0 12-1 19-7M14 1.5l6 .5-.5 6"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 8H2M7 3L2 8l5 5"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5"/></svg>',
    camera: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 5.5a1 1 0 0 1 1-1h2l1-1.5h5l1 1.5h2a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/><circle cx="8" cy="8.5" r="2.4"/></svg>',
    del: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg>'
  };

  var compById = function (id) { return D.competencies.filter(function (c) { return c.id === id; })[0]; };
  var projById = function (id) { return D.projects.filter(function (p) { return p.id === id; })[0]; };

  /* ---------- 그래픽 (평면 도형으로 그린 대표 이미지) ---------- */
  var BLUE = '#0a80d1', INK = '#12161d', NAVY = '#0b1a2e', MIST = '#e6ebf0';
  var frame = function (bg, inner) {
    return '<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true"><rect width="400" height="250" fill="' + bg + '"/>' + inner + '</svg>';
  };
  var curve = function (fn, x0, x1, step) {
    var d = '';
    for (var x = x0; x <= x1; x += step) d += (x === x0 ? 'M' : 'L') + x + ' ' + fn(x).toFixed(1);
    return d;
  };

  var ART = {
    // 전원 계통 단선도
    grid: function () {
      return frame(NAVY,
        '<g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="200" cy="32" r="16" stroke-width="5"/><path d="M191 32c3-8 6-8 9 0s6 8 9 0" stroke-width="3.5"/>' +
        '<path d="M200 48V68M200 106V124" stroke-width="5"/>' +
        '<path d="M56 124H344" stroke-width="9"/><path d="M96 124V160M200 124V160M304 124V160" stroke-width="5"/></g>' +
        '<rect x="184" y="68" width="32" height="38" rx="4" fill="' + BLUE + '"/><path d="M190 98l20-24" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
        '<rect x="78" y="160" width="36" height="36" rx="4" fill="#fff"/><rect x="182" y="160" width="36" height="36" rx="4" fill="#fff"/><rect x="286" y="160" width="36" height="36" rx="4" fill="#fff"/>' +
        '<path d="M200 196v12M178 208h44M186 218h28M194 228h12" fill="none" stroke="' + BLUE + '" stroke-width="5" stroke-linecap="round"/>');
    },
    // 오실로스코프 파형: 왜곡 파형과 기준 파형
    wave: function () {
      var t = function (x) { return (x - 20) / 360 * Math.PI * 4; };
      var clean = function (x) { return 125 - 56 * Math.sin(t(x)); };
      var dist = function (x) { return 125 - (56 * Math.sin(t(x)) + 20 * Math.sin(3 * t(x) + .6) + 8 * Math.sin(5 * t(x))); };
      var px = 65;
      return frame(MIST,
        '<path d="M0 125H400M100 0V250M200 0V250M300 0V250" stroke="#cdd5de" stroke-width="1.5"/>' +
        '<path d="' + curve(clean, 20, 380, 4) + '" fill="none" stroke="' + BLUE + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + curve(dist, 20, 380, 4) + '" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M' + px + ' 20V230" stroke="' + INK + '" stroke-width="2" stroke-dasharray="5 6"/>' +
        '<circle cx="' + px + '" cy="' + dist(px).toFixed(1) + '" r="11" fill="#fff" stroke="' + INK + '" stroke-width="5"/>');
    },
    // 모듈형 이동 장비
    cart: function () {
      return frame(BLUE,
        '<path d="M262 0h96L220 250h-96z" fill="' + INK + '"/>' +
        '<path d="M140 78h-28V26" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<rect x="140" y="34" width="124" height="156" rx="8" fill="#fff"/>' +
        '<path d="M140 86h124M140 138h124" stroke="' + BLUE + '" stroke-width="4"/>' +
        '<rect x="156" y="54" width="52" height="9" rx="4.5" fill="' + INK + '"/><rect x="156" y="106" width="52" height="9" rx="4.5" fill="' + INK + '"/><rect x="156" y="158" width="52" height="9" rx="4.5" fill="' + INK + '"/>' +
        '<circle cx="238" cy="58" r="10" fill="' + BLUE + '"/><circle cx="238" cy="110" r="10" fill="' + BLUE + '"/><circle cx="238" cy="162" r="10" fill="' + BLUE + '"/>' +
        '<circle cx="168" cy="208" r="15" fill="' + INK + '"/><circle cx="168" cy="208" r="5" fill="#fff"/><circle cx="236" cy="208" r="15" fill="' + INK + '"/><circle cx="236" cy="208" r="5" fill="#fff"/>' +
        '<path d="M264 150c44 0 44 40 84 40" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
        '<rect x="344" y="176" width="28" height="28" rx="6" fill="#fff"/><rect x="351" y="184" width="4" height="12" fill="' + INK + '"/><rect x="361" y="184" width="4" height="12" fill="' + INK + '"/>');
    },
    // 국내 기준 ↔ 국제표준 비교
    docs: function () {
      var bars = function (x, y0, widths, fill) {
        return widths.map(function (w, i) { return '<rect x="' + x + '" y="' + (y0 + i * 18) + '" width="' + w + '" height="6" rx="3" fill="' + fill + '"/>'; }).join('');
      };
      return frame(INK,
        '<circle cx="200" cy="128" r="100" fill="' + BLUE + '"/>' +
        '<rect x="92" y="50" width="116" height="156" rx="5" fill="#fff"/>' +
        '<text x="108" y="80" font-family="sans-serif" font-size="15" font-weight="800" fill="' + BLUE + '">KR</text>' + bars(108, 98, [84, 84, 60, 76, 50], INK) +
        '<rect x="192" y="74" width="116" height="156" rx="5" fill="' + MIST + '"/>' +
        '<text x="208" y="104" font-family="sans-serif" font-size="15" font-weight="800" fill="' + INK + '">IEC</text>' + bars(208, 122, [84, 70, 84, 56, 76], INK) +
        '<circle cx="322" cy="66" r="24" fill="#fff"/><path d="M310 66l9 9 16-18" fill="none" stroke="' + BLUE + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>');
    },
    // 시간순 분할 검증: 학습 구간 vs 검증 구간
    ai: function () {
      var s = 7, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647 - .5; };
      var trend = function (x) { return 190 - .42 * (x - 36) + 16 * Math.sin((x - 36) / 32); };
      var dots = '', i, x;
      for (i = 0; i < 26; i++) { x = 36 + i * 8; dots += '<circle cx="' + x + '" cy="' + (trend(x) + rnd() * 26).toFixed(1) + '" r="4.5" fill="' + INK + '"/>'; }
      for (i = 0; i < 14; i++) { x = 262 + i * 8; dots += '<circle cx="' + x + '" cy="' + (trend(x) + rnd() * 40).toFixed(1) + '" r="5" fill="' + BLUE + '"/>'; }
      var pred = function (x) { return trend(236) - .12 * (x - 236); };
      return frame('#fff',
        '<path d="M0 62H400M0 125H400M0 188H400" stroke="#edf1f5" stroke-width="1.5"/>' +
        '<rect x="250" y="0" width="150" height="250" fill="#f2f8fd"/>' +
        '<path d="M250 0V250" stroke="#9aa5b3" stroke-width="2" stroke-dasharray="5 6"/>' +
        dots +
        '<path d="' + curve(trend, 36, 236, 4) + '" fill="none" stroke="' + BLUE + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="' + curve(pred, 236, 372, 4) + '" fill="none" stroke="' + BLUE + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 9"/>' +
        '<text x="143" y="26" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#8a93a1">학습</text>' +
        '<text x="325" y="26" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#8a93a1">검증</text>');
    }
  };

  /* 첫 화면 배경 파형 (움직이는 사인파) */
  function heroWaves() {
    var mk = function (fn, w) { return curve(fn, 0, w, 8); };
    var a = mk(function (x) { return 112 - 46 * Math.sin(x / 400 * Math.PI * 2); }, 2000);
    var b = mk(function (x) { var t = x / 640 * Math.PI * 2; return 112 - (36 * Math.sin(t) + 13 * Math.sin(3 * t + .6) + 5 * Math.sin(5 * t)); }, 2560);
    var c = mk(function (x) { return 112 - 22 * Math.sin(x / 320 * Math.PI * 2 + 1); }, 1920);
    return '<svg viewBox="0 0 1600 220" preserveAspectRatio="none" aria-hidden="true">' +
      '<g class="wv" style="--p:320px;--t:18s"><path d="' + c + '" class="w3"/></g>' +
      '<g class="wv" style="--p:640px;--t:26s"><path d="' + b + '" class="w2"/></g>' +
      '<g class="wv" style="--p:400px;--t:16s"><path d="' + a + '" class="w1"/></g></svg>';
  }

  /* ---------- 화면 조각 ---------- */
  function secHead(key) {
    var s = D.sections[key];
    return '<div class="sec-head"><h2>' + esc(s.title) + '</h2>' + (s.desc ? '<p>' + esc(s.desc) + '</p>' : '') + '</div>';
  }

  function headerHTML() {
    var links = [['intro', '소개'], ['competency', '역량'], ['projects', '프로젝트'], ['achievements', '성과'], ['awards', '수상'], ['lectures', '강의']];
    return '<div class="wrap gnb-in"><a class="logo" href="#intro" aria-label="맨 위로"><b>' + esc(D.profile.name) + '</b><span>Portfolio</span></a>' +
      '<nav class="nav" aria-label="주요 메뉴">' + links.map(function (l) { return '<a href="#' + l[0] + '" data-nav="' + l[0] + '">' + l[1] + '</a>'; }).join('') + '</nav></div>';
  }

  function heroHTML() {
    var p = D.profile;
    var words = p.cover && p.cover.length ? p.cover : ['PORT', 'FOLIO'];
    return '<section class="hero dark" id="intro" data-section><div class="hero-bg" aria-hidden="true">' + heroWaves() + '</div>' +
      '<div class="wrap hero-in"><h1 class="cover"><span class="sr-only">' + esc(p.name) + ' 포트폴리오</span>' +
      '<span class="cover-art" aria-hidden="true">' +
      words.map(function (w, i) { return '<span class="line"><span style="--i:' + i + '">' + esc(w) + '</span></span>'; }).join('') +
      (p.nameEn ? '<span class="tape"><span>' + esc(p.nameEn) + '</span></span>' : '') + '</span></h1>' +
      '<p class="hero-sum">' + esc(p.summary) + '</p></div></section>';
  }

  /* 역량: 왼쪽 메뉴 + 오른쪽 상세 */
  function capSectionHTML() {
    return '<section class="sec dark" id="competency" data-section><div class="wrap">' + secHead('competency') +
      '<div class="cap-layout"><div class="cap-menu" role="tablist" aria-label="역량" aria-orientation="vertical"><span class="cap-ind" aria-hidden="true"></span>' +
      D.competencies.map(function (c) {
        return '<button class="cap-item" type="button" role="tab" id="tab-' + c.id + '" data-cap="' + c.id + '" aria-selected="false" aria-controls="capView"><span>' + esc(c.short) + '</span><i>' + ICON.arrow + '</i></button>';
      }).join('') + '</div><div class="cap-view" id="capView" role="tabpanel" aria-live="polite"></div></div></div></section>';
  }
  function capViewHTML(c) {
    return '<div class="cap-img" data-media="' + c.id + '" data-art="' + c.art + '"></div>' +
      '<h3>' + esc(c.title) + '</h3><p class="cap-lead">' + esc(c.role) + '</p>' +
      '<h4 class="cap-sub">수행 업무</h4><dl class="cap-table">' +
      c.tasks.map(function (t, i) { return '<div style="--r:' + i + '"><dt>' + esc(t.label) + '</dt><dd>' + esc(t.text) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="ev-slot" data-ev="' + c.id + '"></div>';
  }

  /* 프로젝트: 제목 목록 (누르면 상세 페이지) */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function projMeta(p) { return [p.org, p.role, p.period].filter(Boolean).join(' · '); }
  function projSectionHTML() {
    return '<section class="sec light" id="projects" data-section><div class="wrap">' + secHead('projects') + '<ol class="plist">' +
      D.projects.map(function (p, i) {
        var meta = projMeta(p);
        return '<li><button class="prow" type="button" data-open-proj="' + p.id + '">' +
          '<span class="pr-no">' + pad2(i + 1) + '</span>' +
          '<span class="pr-thumb" data-media="' + p.id + '" data-art="' + p.art + '"></span>' +
          '<span class="pr-main"><span class="pr-title">' + esc(p.title) + '</span>' + (meta ? '<span class="pr-meta">' + esc(meta) + '</span>' : '') + '</span>' +
          '<span class="pr-go" aria-hidden="true">' + ICON.right + '</span>' +
          '<span class="tile-badge" data-ev-badge="' + p.id + '"></span></button></li>';
      }).join('') + '</ol></div></section>';
  }

  /* 성과: 연혁형 (큰 키워드 + 문제·방법·결과) */
  function achSectionHTML() {
    var counts = {};
    D.achievements.forEach(function (a) { counts[a.comp] = (counts[a.comp] || 0) + 1; });
    var items = [{ id: 'all', label: '전체', n: D.achievements.length }].concat(D.competencies.map(function (c) { return { id: c.id, label: c.short, n: counts[c.id] || 0 }; }).filter(function (it) { return it.n > 0; }));
    return '<section class="sec dark alt" id="achievements" data-section><div class="wrap">' + secHead('achievements') +
      '<div class="hist-tabs" role="group" aria-label="역량별 필터">' +
      items.map(function (it) { return '<button class="tab" type="button" data-filter="' + it.id + '" aria-pressed="' + (it.id === 'all') + '">' + esc(it.label) + '<em>' + it.n + '</em></button>'; }).join('') +
      '</div><div class="hist" id="hist"></div></div></section>';
  }
  function histItemHTML(a, i) {
    var c = compById(a.comp);
    var head = a.cert
      ? '<div class="aw-head"><h3>' + esc(a.title) + '</h3><div class="ev-slot ev-cert" data-ev="' + a.id + '" data-one data-label="상장" data-alt="' + esc(a.title) + ' 상장"></div></div>'
      : '<h3>' + esc(a.title) + '</h3>';
    return '<article class="hist-item" data-id="' + a.id + '"' + (a.comp ? ' data-comp="' + a.comp + '"' : '') + ' style="--i:' + i + '">' +
      '<div class="hist-key"><span>' + esc(a.key) + '</span>' + (c ? '<small>' + esc(c.short) + '</small>' : '') + '</div>' +
      '<div class="hist-body">' + head + '<ul class="hist-lines">' +
      a.lines.map(function (l) { return '<li><span>' + esc(l.k) + '</span><p>' + esc(l.v) + '</p></li>'; }).join('') + '</ul>' +
      (a.cert ? '' : '<div class="ev-slot" data-ev="' + a.id + '"></div>') + '</div></article>';
  }

  /* 수상: 성과와 같은 연혁형 (큰 연도 + 상세) */
  function awardSectionHTML() {
    var list = D.awards || [];
    if (!list.length) return '';
    return '<section class="sec dark" id="awards" data-section><div class="wrap">' + secHead('awards') + '<div class="hist" id="awardList">' +
      list.map(function (w, i) { return histItemHTML({ id: w.id, key: w.year, title: w.name, lines: w.lines, cert: true }, i); }).join('') +
      '</div></div></section>';
  }

  function lecSectionHTML() {
    return '<section class="sec light" id="lectures" data-section><div class="wrap">' + secHead('lectures') + '<div class="lec-grid">' +
      D.lectures.map(function (l) {
        return '<article class="lec" data-id="' + l.id + '"><p class="lec-org">' + esc(l.org) + '</p><h3>' + esc(l.title) + '</h3>' +
          '<ul class="chips">' + l.audience.map(function (a) { return '<li><span class="chip sm static">' + esc(a) + '</span></li>'; }).join('') + '</ul>' +
          '<div class="ev-slot ev-lec" data-ev="' + l.id + '" data-one data-label="사진 추가" data-alt="' + esc(l.org) + ' 강의 사진"></div></article>';
      }).join('') + '</div></div></section>';
  }

  function footHTML() {
    var c = D.profile.contact || {};
    var parts = [];
    if (c.email) parts.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    if (c.phone) parts.push('<span>' + esc(c.phone) + '</span>');
    return '<div class="wrap foot-in"><p class="foot-name">' + esc(D.profile.name) + '</p>' +
      '<p class="foot-sub">전기차 충전 인프라 시험 · 인증 · 구축</p>' + (parts.length ? '<p class="foot-contact">' + parts.join('<i></i>') + '</p>' : '') + '</div>';
  }

  /* ---------- 이미지 ---------- */
  function srcOf(e) { return state.previews[e.src] || e.src; }

  /* 한 장짜리 칸 (상장 · 강의 사진): 사진이 있으면 보여 주고, 관리자는 바꾸기/삭제, 없으면 방문자에게는 숨김 */
  function evOneHTML(id, list, adm, o) {
    var e = list[0], label = o.label || '사진 추가', alt = o.alt || '이미지';
    if (!e) return '<label class="ev-add one">' + ICON.camera + '<span>' + esc(label) + '</span><input type="file" accept="image/*" data-one data-ev-upload="' + id + '"></label>';
    return '<figure class="ev-one"><button class="ev-thumb" type="button" data-ev-open="' + id + '" data-i="0" aria-label="' + esc(alt) + ' 크게 보기">' +
      '<img loading="lazy" decoding="async" src="' + esc(srcOf(e)) + '" alt="' + esc(alt) + '"></button>' +
      (adm ? '<button class="ev-del" type="button" data-ev-del="' + id + '" data-i="0" aria-label="사진 삭제">' + ICON.del + '</button>' +
        '<label class="ev-swap" title="사진 바꾸기">' + ICON.camera + '<input type="file" accept="image/*" data-one data-ev-upload="' + id + '" aria-label="사진 바꾸기"></label>' : '') +
      '</figure>';
  }

  function evHTML(id, o) {
    var list = state.evidence[id] || [];
    var adm = !!state.admin;
    if (!list.length && !adm) return '';
    if (o && o.one) return evOneHTML(id, list, adm, o);
    var items = list.map(function (e, i) {
      var cap = e.caption || '';
      return '<figure class="ev-item"><button class="ev-thumb" type="button" data-ev-open="' + id + '" data-i="' + i + '" aria-label="이미지 크게 보기' + (cap ? ': ' + esc(cap) : '') + '">' +
        '<img loading="lazy" decoding="async" src="' + esc(srcOf(e)) + '" alt="' + esc(cap || '이미지') + '"></button>' +
        (adm
          ? '<button class="ev-del" type="button" data-ev-del="' + id + '" data-i="' + i + '" aria-label="사진 삭제">' + ICON.del + '</button>' +
            '<input class="ev-cap" type="text" maxlength="80" data-ev-cap="' + id + '" data-i="' + i + '" value="' + esc(cap) + '" placeholder="사진 설명 입력">'
          : (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '')) +
        '</figure>';
    }).join('');
    var add = adm ? '<label class="ev-add"><input type="file" accept="image/*" multiple data-ev-upload="' + id + '">' + ICON.camera + '<span>사진 추가</span></label>' : '';
    return '<div class="ev-head">이미지<span>' + list.length + '</span></div><div class="ev-grid">' + items + add + '</div>';
  }

  function mediaHTML(id, art) {
    var first = (state.evidence[id] || [])[0];
    if (first) return '<img decoding="async" src="' + esc(srcOf(first)) + '" alt="' + esc(first.caption || '이미지') + '">';
    return ART[art] ? ART[art]() : '';
  }

  function refreshEvidence() {
    $$('.ev-slot').forEach(function (el) {
      if (el.contains(document.activeElement) && document.activeElement.matches('.ev-cap')) return;
      el.innerHTML = evHTML(el.dataset.ev, { one: el.hasAttribute('data-one'), label: el.dataset.label, alt: el.dataset.alt });
    });
    $$('[data-ev-badge]').forEach(function (el) {
      var n = (state.evidence[el.dataset.evBadge] || []).length;
      el.innerHTML = n ? '<span class="ev-badge">' + ICON.camera + n + '</span>' : '';
    });
    // 대표 이미지: 올린 이미지가 있으면 첫 번째, 없으면 기본 그래픽
    $$('[data-media]').forEach(function (el) {
      var first = (state.evidence[el.dataset.media] || [])[0];
      var key = first ? srcOf(first) : 'art';
      if (el.dataset.mk === key) return;
      el.dataset.mk = key;
      el.innerHTML = mediaHTML(el.dataset.media, el.dataset.art);
    });
    if (lb.el && lb.el.classList.contains('open')) paintLB();
  }

  function normalizeEvidence(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (k) {
      if (Array.isArray(raw[k])) out[k] = raw[k].filter(function (e) { return e && e.src; });
    });
    return out;
  }

  function loadEvidence() {
    return fetch('evidence.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (j) {
        /* 파일을 PC에서 직접 열면(index.html 더블클릭) evidence.json 을 읽을 수 없어서, 같이 들어 있는 사본을 대신 사용 */
        if (!j) j = window.PORTFOLIO_EVIDENCE || {};
        state.evidence = normalizeEvidence(j); refreshEvidence();
      });
  }

  /* 사진 로딩 실패: 관리자는 raw 주소로 한 번 더 시도, 그래도 안 되면 안내 표시(대표 이미지는 기본 그래픽으로 복귀) */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var a = state.admin, src = img.getAttribute('src') || '';
    var media = img.closest('[data-media]'), thumb = img.closest('.ev-thumb'), inLb = img.closest('.lb-fig');
    if (!media && !thumb && !inLb) return;
    if (a && !img.dataset.retry && src.indexOf('evidence/') === 0) {
      img.dataset.retry = '1';
      img.src = 'https://raw.githubusercontent.com/' + a.owner + '/' + a.repo + '/' + a.branch + '/' + src;
      return;
    }
    if (media) { media.dataset.mk = 'art'; media.innerHTML = ART[media.dataset.art] ? ART[media.dataset.art]() : ''; return; }
    if (thumb) { thumb.classList.add('pending'); thumb.textContent = a ? '반영 중 (약 1분)' : '사진 없음'; }
  }, true);

  /* ---------- 역량 탭 ---------- */
  function positionInd() {
    var ind = $('.cap-ind'), act = $('.cap-item.is-active');
    if (!ind || !act) return;
    ind.style.setProperty('--y', act.offsetTop + 'px');
    ind.style.setProperty('--h', act.offsetHeight + 'px');
  }
  function selectCap(id) {
    var c = compById(id);
    if (!c) return;
    var changed = state.cap !== id;
    state.cap = id;
    $$('.cap-item').forEach(function (b) {
      var on = b.dataset.cap === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    positionInd();
    // 모바일: 가로로 스크롤되는 메뉴에서 선택 항목이 보이도록
    var menu = $('.cap-menu'), act = $('.cap-item.is-active');
    if (menu && act && menu.scrollWidth > menu.clientWidth + 2 && getComputedStyle(menu).display === 'flex') {
      menu.scrollTo({ left: act.offsetLeft - 20, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    if (changed || !$('#capView').firstChild) {
      var v = $('#capView');
      v.setAttribute('aria-labelledby', 'tab-' + id);
      v.innerHTML = capViewHTML(c);
      refreshEvidence();
    }
  }
  function gotoCap(id) {
    closeProj();
    $('#competency').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { selectCap(id); }, reduceMotion ? 0 : 350);
  }

  /* ---------- 성과 필터 ---------- */
  var histIO = null;
  function renderHist(animate) {
    var list = D.achievements.filter(function (a) { return state.filter === 'all' || a.comp === state.filter; });
    var box = $('#hist');
    box.classList.toggle('anim', !!animate);
    box.innerHTML = list.map(histItemHTML).join('');
    $$('.hist-item', box).forEach(function (el) {
      if (animate || !histIO) el.classList.add('in'); else histIO.observe(el);
    });
    refreshEvidence();
  }
  function setFilter(id, animate) {
    state.filter = id;
    $$('.tab').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === id)); });
    renderHist(animate);
  }

  /* ---------- 오버레이 공통 ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapTab(e, box) {
    if (e.key !== 'Tab') return;
    var f = $$(FOCUSABLE, box).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* 프로젝트 상세 */
  var proj = { el: null, body: null, side: null, opener: null };
  function projSideHTML(activeId) {
    return '<p class="ps-h">Projects</p><ul>' +
      D.projects.map(function (p) { return '<li><button type="button" data-open-proj="' + p.id + '"' + (p.id === activeId ? ' class="is-active" aria-current="true"' : '') + '>' + esc(p.title) + '</button></li>'; }).join('') + '</ul>';
  }
  function projBodyHTML(p, idx) {
    var comps = p.competencies.map(compById).filter(Boolean);
    var prev = D.projects[(idx - 1 + D.projects.length) % D.projects.length];
    var next = D.projects[(idx + 1) % D.projects.length];
    var meta = [p.role, p.org, p.period].filter(Boolean).map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('');
    return '<header class="pj-head"><h2>' + esc(p.title) + '</h2><p class="pj-lead">' + esc(p.lead || '') + '</p>' + (meta ? '<p class="pj-meta">' + meta + '</p>' : '') + '</header>' +
      '<div class="pj-media" data-media="' + p.id + '" data-art="' + p.art + '"></div>' +
      '<h3 class="pj-sub">핵심 업무</h3><ul class="pj-points">' +
      p.points.map(function (x, i) { return '<li style="--r:' + i + '">' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (comps.length ? '<div class="tags"><span>관련 역량</span>' + comps.map(function (c) { return '<button class="chip sm" type="button" data-goto-cap="' + c.id + '">' + esc(c.short) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="ev-slot" data-ev="' + p.id + '"></div>' +
      '<nav class="pj-nav" aria-label="프로젝트 이동"><button type="button" data-open-proj="' + prev.id + '">' + ICON.left + '<span>' + esc(prev.title) + '</span></button>' +
      '<button type="button" data-open-proj="' + next.id + '"><span>' + esc(next.title) + '</span>' + ICON.right + '</button></nav>';
  }
  function openProj(id, opener) {
    var idx = -1;
    D.projects.forEach(function (p, i) { if (p.id === id) idx = i; });
    if (idx < 0) return;
    var wasOpen = proj.el.classList.contains('open');
    if (!wasOpen) proj.opener = opener || null;
    state.proj = id;
    proj.side.innerHTML = projSideHTML(id);
    proj.body.innerHTML = projBodyHTML(D.projects[idx], idx);
    proj.body.classList.remove('swap'); void proj.body.offsetWidth; proj.body.classList.add('swap');
    refreshEvidence();
    proj.el.scrollTop = 0;
    proj.el.classList.add('open');
    proj.el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lock');
    if (!wasOpen) setTimeout(function () { $('.proj-close', proj.el).focus(); }, 60);
  }
  function closeProj() {
    if (!proj.el.classList.contains('open')) return;
    proj.el.classList.remove('open');
    proj.el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('lock');
    state.proj = null;
    if (proj.opener && document.contains(proj.opener)) proj.opener.focus();
  }

  /* 사진 확대 */
  var lb = { el: null, img: null, cap: null, count: null, id: null, i: 0, opener: null };
  function paintLB() {
    var list = state.evidence[lb.id] || [];
    var e = list[lb.i];
    if (!e) { closeLB(); return; }
    lb.img.removeAttribute('data-retry');
    lb.img.src = srcOf(e);
    lb.img.alt = e.caption || '이미지';
    lb.cap.textContent = e.caption || '';
    lb.count.textContent = list.length > 1 ? (lb.i + 1) + ' / ' + list.length : '';
    lb.el.classList.toggle('single', list.length < 2);
  }
  function openLB(id, i, opener) {
    lb.id = id; lb.i = i; lb.opener = opener || null;
    paintLB();
    lb.el.classList.add('open');
    lb.el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lock');
    setTimeout(function () { $('.lb-close', lb.el).focus(); }, 60);
  }
  function stepLB(d) {
    var list = state.evidence[lb.id] || [];
    if (list.length < 2) return;
    lb.i = (lb.i + d + list.length) % list.length;
    paintLB();
    if (!reduceMotion && lb.img.animate) lb.img.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,.8,.24,1)' });
  }
  function closeLB() {
    if (!lb.el.classList.contains('open')) return;
    lb.el.classList.remove('open');
    lb.el.setAttribute('aria-hidden', 'true');
    if (!proj.el.classList.contains('open')) document.documentElement.classList.remove('lock');
    if (lb.opener && document.contains(lb.opener)) lb.opener.focus();
  }

  /* 알림 */
  var toastTimer;
  function toast(msg, type, sticky) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    if (!sticky) toastTimer = setTimeout(function () { t.classList.remove('show'); }, type === 'err' ? 7000 : 3800);
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target, m;
    if ((m = t.closest('[data-open-proj]'))) { openProj(m.dataset.openProj, m); return; }
    if (t.closest('[data-close-proj]')) { closeProj(); return; }
    if ((m = t.closest('[data-goto-cap]'))) { gotoCap(m.dataset.gotoCap); return; }
    if ((m = t.closest('[data-cap]'))) { selectCap(m.dataset.cap); return; }
    if ((m = t.closest('[data-filter]'))) { setFilter(m.dataset.filter, true); return; }
    if ((m = t.closest('[data-ev-open]'))) { openLB(m.dataset.evOpen, +m.dataset.i, m); return; }
    if ((m = t.closest('[data-lb]'))) {
      var a = m.dataset.lb;
      if (a === 'close') closeLB(); else stepLB(a === 'next' ? 1 : -1);
      return;
    }
    if (t === lb.el) closeLB();
  });

  // 마우스를 올리면 해당 역량으로 전환 (PC)
  document.addEventListener('pointerover', function (e) {
    if (!canHover.matches || !e.target.closest) return;
    var b = e.target.closest('.cap-item');
    if (b && !b.classList.contains('is-active')) selectCap(b.dataset.cap);
  });
  // 키보드(Tab)로 이동했을 때만 전환. 마우스·터치는 click 이 처리
  document.addEventListener('focusin', function (e) {
    var b = e.target.closest && e.target.closest('.cap-item');
    if (!b || b.classList.contains('is-active')) return;
    var kb = true;
    try { kb = b.matches(':focus-visible'); } catch (x) { kb = true; }
    if (kb) selectCap(b.dataset.cap);
  });
  document.addEventListener('keydown', function (e) {
    if (lb.el.classList.contains('open')) {
      if (e.key === 'Escape') { closeLB(); return; }
      if (e.key === 'ArrowRight') { stepLB(1); return; }
      if (e.key === 'ArrowLeft') { stepLB(-1); return; }
      trapTab(e, lb.el); return;
    }
    if (proj.el.classList.contains('open')) {
      if (e.key === 'Escape') { closeProj(); return; }
      trapTab(e, proj.el); return;
    }
    var item = e.target.closest && e.target.closest('.cap-item');
    if (item && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      var all = $$('.cap-item'), i = all.indexOf(item) + (e.key === 'ArrowDown' ? 1 : -1);
      all[(i + all.length) % all.length].focus();
    }
  });
  window.addEventListener('resize', positionInd);

  /* ---------- 시작 ---------- */
  function init() {
    document.title = D.site.title;
    $('#gnb').innerHTML = headerHTML();
    $('#app').innerHTML = heroHTML() + capSectionHTML() + projSectionHTML() + achSectionHTML() + awardSectionHTML() + lecSectionHTML();
    $('#foot').innerHTML = footHTML();

    proj.el = $('#proj'); proj.body = $('#projBody'); proj.side = $('#projSide');
    lb.el = $('#lb'); lb.img = $('#lbImg'); lb.cap = $('#lbCap'); lb.count = $('#lbCount');

    // 스크롤하면 나타나는 연혁형 성과
    if ('IntersectionObserver' in window) {
      document.documentElement.classList.add('rv');
      histIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); histIO.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    }

    selectCap(D.competencies[0].id);
    renderHist(false);
    $$('#awardList .hist-item').forEach(function (el) { if (histIO) histIO.observe(el); else el.classList.add('in'); });
    refreshEvidence();

    // 상단 메뉴: 스크롤 시 배경, 현재 위치 표시
    var gnb = $('#gnb');
    var onScroll = function () { gnb.classList.toggle('scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          $$('.nav a').forEach(function (a) { a.classList.toggle('is-active', a.dataset.nav === en.target.id); });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      $$('[data-section]').forEach(function (s) { io.observe(s); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionInd);
  }

  init();

  // 관리자 모드(js/admin.js)와 공유하는 부분
  window.PF = {
    state: state, esc: esc, toast: toast, refreshEvidence: refreshEvidence,
    normalizeEvidence: normalizeEvidence, closeLB: closeLB,
    evidenceReady: loadEvidence()
  };
})();
