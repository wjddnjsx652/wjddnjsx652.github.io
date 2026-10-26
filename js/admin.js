/* ==========================================================================
   관리자 모드 — 이미지를 GitHub 저장소에 바로 올립니다.

   사용법: 사이트 주소 끝에 #admin 을 붙여 접속 → 사용자명·저장소·토큰 입력.
   - 사진은 브라우저에서 줄여서(긴 변 1800px) 저장소의 evidence/ 폴더에 올라갑니다.
   - 어느 항목에 어떤 사진이 있는지는 evidence.json 에 기록됩니다.
   - 방문자는 evidence.json 을 읽어 사진을 봅니다. 관리자 연결 없이는 아무것도 바꿀 수 없습니다.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  if (!PF) return;
  var state = PF.state, esc = PF.esc, toast = PF.toast;

  var KEY = 'pf_admin_v1';
  var API = 'https://api.github.com';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var cfg = null;
  var busy = false;

  /* ---------- 인코딩 ---------- */
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function blobToB64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
      fr.onerror = function () { reject(new Error('파일을 읽지 못했습니다.')); };
      fr.readAsDataURL(blob);
    });
  }
  var encPath = function (p) { return p.split('/').map(encodeURIComponent).join('/'); };

  /* ---------- GitHub API ---------- */
  function friendly(status, apiMsg) {
    if (status === 401) return '토큰이 올바르지 않거나 만료되었습니다. 토큰을 새로 만들어 다시 연결해 주세요.';
    if (status === 403) return '권한이 없습니다. 토큰의 Contents 권한이 "Read and write"인지, 이 저장소가 선택되어 있는지 확인해 주세요.';
    if (status === 404) return '저장소나 브랜치를 찾을 수 없거나, 토큰이 이 저장소에 접근할 수 없습니다. 사용자명·저장소 이름·브랜치를 확인해 주세요.';
    if (status === 409 || status === 422) return '저장 충돌이 발생했습니다. 잠시 후 다시 시도해 주세요.';
    return apiMsg || ('GitHub 요청에 실패했습니다 (' + status + ').');
  }

  function gh(path, opts) {
    opts = opts || {};
    var headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + cfg.token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + '/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + path, {
      method: opts.method || 'GET', headers: headers, body: opts.body, cache: 'no-store'
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var err = new Error(friendly(r.status, j && j.message)); err.status = r.status; throw err; }
        return j;
      });
    }, function () {
      throw new Error('GitHub에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.');
    });
  }

  function getFile(path) {
    return gh('/contents/' + encPath(path) + '?ref=' + encodeURIComponent(cfg.branch)).then(function (j) {
      return { sha: j.sha, text: j.content ? b64ToUtf8(j.content) : '' };
    }, function (e) { if (e.status === 404) return null; throw e; });
  }

  function putFile(path, b64, message, sha) {
    var body = { message: message, content: b64, branch: cfg.branch };
    if (sha) body.sha = sha;
    return gh('/contents/' + encPath(path), { method: 'PUT', body: JSON.stringify(body) });
  }

  function deleteFile(path, message) {
    return getFile(path).then(function (f) {
      if (!f) return null;
      return gh('/contents/' + encPath(path), { method: 'DELETE', body: JSON.stringify({ message: message, sha: f.sha, branch: cfg.branch }) });
    });
  }

  /* evidence.json 을 읽고 → 수정하고 → 저장. 충돌 시 최대 3번 다시 시도 */
  function mutateEvidence(mutator, message) {
    var attempt = 0;
    function run() {
      return getFile('evidence.json').then(function (cur) {
        var data = {};
        if (cur && cur.text) { try { data = JSON.parse(cur.text) || {}; } catch (e) { data = {}; } }
        data = PF.normalizeEvidence(data);
        mutator(data);
        return putFile('evidence.json', utf8ToB64(JSON.stringify(data, null, 2) + '\n'), message, cur && cur.sha).then(function () { return data; });
      }).catch(function (e) {
        if ((e.status === 409 || e.status === 422) && ++attempt < 3) return run();
        throw e;
      });
    }
    return run();
  }

  /* ---------- 사진 줄이기 ---------- */
  function decode(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file).catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('이 사진 형식은 열 수 없습니다. JPG 또는 PNG로 올려 주세요.')); };
      img.src = url;
    });
  }
  var api = {
    compress: function (file) {
      return decode(file).then(function (bmp) {
        var w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
        var scale = Math.min(1, 1800 / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        if (bmp.close) bmp.close();
        return new Promise(function (resolve, reject) {
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error('사진을 변환하지 못했습니다.')); }, 'image/jpeg', 0.85);
        });
      });
    }
  };
  PF.adminApi = api;

  /* ---------- 업로드 · 설명 · 삭제 ---------- */
  function guard() {
    if (!cfg) { toast('먼저 관리자 연결이 필요합니다.', 'err'); return false; }
    if (busy) { toast('이전 작업이 끝날 때까지 잠시만 기다려 주세요.'); return false; }
    return true;
  }

  // one = 한 장짜리 칸(상장·강의 사진): 한 장만 받고, 기존 사진은 새 사진으로 교체
  function uploadFiles(id, files, one) {
    files = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(f.name); });
    if (!files.length) { toast('이미지 파일(JPG, PNG)만 올릴 수 있습니다.', 'err'); return Promise.resolve(); }
    if (one) files = files.slice(0, 1);
    if (!guard()) return Promise.resolve();
    busy = true;
    var uploaded = [], stamp = Date.now(), failed = 0, lastErr = null, replaced = [];

    var chain = Promise.resolve();
    files.forEach(function (file, i) {
      chain = chain.then(function () {
        toast('사진 올리는 중… (' + (i + 1) + '/' + files.length + ')', '', true);
        return api.compress(file).then(function (blob) {
          var path = 'evidence/' + id + '-' + stamp + '-' + i + '.jpg';
          return blobToB64(blob).then(function (b64) {
            return putFile(path, b64, '이미지 추가 (' + id + ')').then(function () {
              state.previews[path] = URL.createObjectURL(blob);
              uploaded.push({ src: path, caption: '', added: new Date().toISOString().slice(0, 10) });
            });
          });
        }).catch(function (e) { failed++; lastErr = e; });
      });
    });

    return chain.then(function () {
      if (!uploaded.length) throw lastErr || new Error('올라간 사진이 없습니다.');
      toast('목록에 반영하는 중…', '', true);
      return mutateEvidence(function (data) {
        if (one) { replaced = (data[id] || []).map(function (e) { return e.src; }); data[id] = uploaded; }
        else data[id] = (data[id] || []).concat(uploaded);
      }, '이미지 목록 갱신 (' + id + ')');
    }).then(function (data) {
      state.evidence = data;
      PF.refreshEvidence();
      // 교체된 이전 사진 파일은 저장소에서도 정리 (실패해도 무시)
      replaced.forEach(function (src) { deleteFile(src, '이전 사진 정리').catch(function () {}); });
      toast(uploaded.length + '장 올렸습니다. 공개 페이지에는 약 1분 뒤 보입니다.' + (failed ? ' (' + failed + '장 실패: ' + lastErr.message + ')' : ''), failed ? 'err' : 'ok');
    }).catch(function (e) { toast(e.message, 'err'); })
      .then(function () { busy = false; });
  }

  function saveCaption(id, i, text) {
    var cur = (state.evidence[id] || [])[i];
    if (!cur || (cur.caption || '') === text) return;
    if (!guard()) return;
    busy = true;
    var src = cur.src;
    toast('설명 저장 중…', '', true);
    mutateEvidence(function (data) {
      (data[id] || []).forEach(function (e) { if (e.src === src) e.caption = text; });
    }, '이미지 설명 수정 (' + id + ')').then(function (data) {
      state.evidence = data; PF.refreshEvidence(); toast('설명을 저장했습니다.', 'ok');
    }).catch(function (e) { toast(e.message, 'err'); }).then(function () { busy = false; });
  }

  function removePhoto(id, i) {
    var cur = (state.evidence[id] || [])[i];
    if (!cur) return;
    if (!window.confirm('이 사진을 삭제할까요?\nGitHub 저장소에서도 지워집니다.')) return;
    if (!guard()) return;
    busy = true;
    var src = cur.src;
    toast('삭제 중…', '', true);
    mutateEvidence(function (data) {
      data[id] = (data[id] || []).filter(function (e) { return e.src !== src; });
      if (!data[id].length) delete data[id];
    }, '이미지 삭제 (' + id + ')').then(function (data) {
      state.evidence = data; PF.refreshEvidence();
      return deleteFile(src, '이미지 파일 삭제').catch(function () { /* 목록에서는 이미 빠졌으므로 무시 */ });
    }).then(function () { toast('삭제했습니다.', 'ok'); })
      .catch(function (e) { toast(e.message, 'err'); }).then(function () { busy = false; });
  }

  /* ---------- 연결 / 해제 ---------- */
  var modal, bar;

  function buildUI() {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<form class="modal-card" role="dialog" aria-modal="true" aria-labelledby="am-t" autocomplete="off">' +
      '<h2 id="am-t">관리자 모드</h2>' +
      '<p class="modal-sub">이미지를 GitHub 저장소에 올리려면 연결이 필요합니다. 토큰은 이 브라우저에만 저장되며 다른 곳으로 보내지 않습니다.</p>' +
      '<label>GitHub 사용자명<input type="text" name="owner" required spellcheck="false" autocapitalize="off"></label>' +
      '<label>저장소 이름<input type="text" name="repo" required spellcheck="false" autocapitalize="off"></label>' +
      '<label>브랜치<input type="text" name="branch" value="main" required spellcheck="false" autocapitalize="off"></label>' +
      '<label>Access Token<input type="password" name="token" required spellcheck="false" placeholder="github_pat_..."></label>' +
      '<label class="check"><input type="checkbox" name="remember" checked> 이 브라우저에 저장 (공용 PC라면 해제)</label>' +
      '<p class="modal-err" role="alert"></p>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" data-am="cancel">취소</button><button type="submit" class="btn">연결</button></div>' +
      '</form>';
    document.body.appendChild(modal);

    bar = document.createElement('div');
    bar.className = 'admin-bar';
    bar.innerHTML = '<span class="dot"></span><span class="t">관리자 모드</span><button type="button" data-am="exit">나가기</button>';
    document.body.appendChild(bar);

    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    modal.querySelector('[data-am="cancel"]').addEventListener('click', closeModal);
    modal.querySelector('form').addEventListener('submit', onSubmit);
    modal.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    bar.querySelector('[data-am="exit"]').addEventListener('click', exitAdmin);
  }

  function guessRepo() {
    var host = location.hostname, parts = location.pathname.split('/').filter(Boolean);
    if (/\.github\.io$/.test(host)) {
      var owner = host.split('.')[0];
      var repo = parts.length && !/\.html?$/.test(parts[0]) ? parts[0] : owner + '.github.io';
      return { owner: owner, repo: repo };
    }
    return { owner: '', repo: '' };
  }

  function openModal(prefill) {
    var f = modal.querySelector('form');
    var g = prefill || guessRepo();
    f.owner.value = g.owner || ''; f.repo.value = g.repo || ''; f.branch.value = g.branch || 'main'; f.token.value = '';
    modal.querySelector('.modal-err').textContent = '';
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    setTimeout(function () { (f.owner.value ? f.token : f.owner).focus(); }, 80);
  }
  function closeModal() {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    if (location.hash === '#admin' && !cfg) history.replaceState(null, '', location.pathname + location.search);
  }

  function onSubmit(e) {
    e.preventDefault();
    var f = e.target, err = modal.querySelector('.modal-err'), btn = f.querySelector('[type="submit"]');
    var next = { owner: f.owner.value.trim(), repo: f.repo.value.trim().replace(/\.git$/, ''), branch: f.branch.value.trim() || 'main', token: f.token.value.trim() };
    err.textContent = '';
    btn.disabled = true; btn.textContent = '확인 중…';
    connect(next).then(function () {
      if (f.remember.checked) { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (x) { /* 저장 실패는 무시 */ } }
      closeModal();
      toast('관리자 모드로 연결했습니다. 각 항목의 "사진 추가"를 눌러 올려 보세요.', 'ok');
    }).catch(function (x) { err.textContent = x.message; cfg = null; })
      .then(function () { btn.disabled = false; btn.textContent = '연결'; });
  }

  function connect(c) {
    cfg = c;
    return gh('').then(function (repo) {
      if (repo && repo.permissions && repo.permissions.push === false) {
        throw new Error('이 토큰에는 쓰기 권한이 없습니다. Contents 권한을 "Read and write"로 설정해 주세요.');
      }
      return getFile('evidence.json');
    }).then(function (f) {
      var data = {};
      if (f && f.text) { try { data = JSON.parse(f.text); } catch (x) { data = {}; } }
      state.evidence = PF.normalizeEvidence(data);
      state.admin = { owner: c.owner, repo: c.repo, branch: c.branch };
      document.documentElement.classList.add('admin-on');
      bar.querySelector('.t').innerHTML = '관리자 모드 · <b>' + esc(c.owner + '/' + c.repo) + '</b>';
      bar.classList.add('show');
      PF.refreshEvidence();
    });
  }

  function exitAdmin() {
    cfg = null; state.admin = null;
    try { localStorage.removeItem(KEY); } catch (x) { /* 무시 */ }
    document.documentElement.classList.remove('admin-on');
    bar.classList.remove('show');
    if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search);
    PF.closeLB();
    PF.evidenceReady = fetch('evidence.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
      .then(function (j) { state.evidence = PF.normalizeEvidence(j); PF.refreshEvidence(); });
    toast('관리자 모드를 종료했습니다.');
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-ev-upload]')) {
      var files = t.files; var id = t.dataset.evUpload;
      uploadFiles(id, files, t.hasAttribute('data-one')).then(function () { t.value = ''; });
    } else if (t.matches && t.matches('[data-ev-cap]')) {
      saveCaption(t.dataset.evCap, +t.dataset.i, t.value.trim());
    }
  });
  document.addEventListener('click', function (e) {
    var d = e.target.closest && e.target.closest('[data-ev-del]');
    if (d && state.admin) { removePhoto(d.dataset.evDel, +d.dataset.i); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.ev-cap')) { e.preventDefault(); e.target.blur(); }
  });

  // 사진을 항목 위로 끌어다 놓아도 업로드
  function slotOf(e) { return state.admin && e.target.closest ? e.target.closest('.ev-slot') : null; }
  document.addEventListener('dragover', function (e) {
    var s = slotOf(e);
    if (s && e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1) { e.preventDefault(); s.classList.add('drag'); }
  });
  document.addEventListener('dragleave', function (e) { var s = slotOf(e); if (s && !s.contains(e.relatedTarget)) s.classList.remove('drag'); });
  document.addEventListener('drop', function (e) {
    var s = slotOf(e);
    if (!s) return;
    e.preventDefault(); s.classList.remove('drag');
    uploadFiles(s.dataset.ev, e.dataTransfer.files, s.hasAttribute('data-one'));
  });

  /* ---------- 시작 ---------- */
  function wantsAdmin() { return location.hash === '#admin' || /(^|[?&])admin(=|&|$)/.test(location.search); }

  function start() {
    buildUI();
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (x) { saved = null; }
    if (saved && saved.token && wantsAdmin()) {
      connect(saved).then(function () { toast('관리자 모드로 연결했습니다.', 'ok'); })
        .catch(function (x) { cfg = null; openModal(saved); modal.querySelector('.modal-err').textContent = x.message; });
    } else if (wantsAdmin()) {
      openModal(saved);
    }
    window.addEventListener('hashchange', function () {
      if (wantsAdmin() && !cfg) openModal(saved);
    });
  }

  PF.evidenceReady.then(start);
})();
