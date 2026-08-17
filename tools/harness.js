// 가짜 DOM + 실데이터 fetch 스텁으로 급식표 앱을 통째로 돌린다.
var FIXTURE = JSON.parse(readFile('fixture.json'));
var APP = readFile('app.js');
var LOG = [];

function Node(tag) {
  this.tag = tag; this.children = []; this.attrs = {}; this.text = null;
  this.style = {}; this._cls = '';
  var self = this;
  this.classList = {
    add: function (c) { if (!self.has(c)) self._cls = (self._cls + ' ' + c).trim(); },
    remove: function (c) { self._cls = self._cls.split(/\s+/).filter(function (x) { return x !== c; }).join(' '); },
    contains: function (c) { return self.has(c); },
    toggle: function (c, on) { on ? this.add(c) : this.remove(c); }
  };
}
Node.prototype.has = function (c) { return (' ' + this._cls + ' ').indexOf(' ' + c + ' ') >= 0; };
Object.defineProperty(Node.prototype, 'className', {
  get: function () { return this._cls; }, set: function (v) { this._cls = v || ''; }
});
Object.defineProperty(Node.prototype, 'textContent', {
  get: function () { return this.text || ''; },
  set: function (v) { this.text = (v === '' ? null : v); this.children = []; }
});
Object.defineProperty(Node.prototype, 'hidden', {
  get: function () { return !!this.attrs.hidden; }, set: function (v) { this.attrs.hidden = !!v; }
});
Node.prototype.append = function () {
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (this.text != null) { this.children.push(String(this.text)); this.text = null; }
    this.children.push(a);
  }
};
Node.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
Node.prototype.getAttribute = function (k) { return this.attrs[k]; };
Node.prototype.addEventListener = function (t, fn) { (this._ev = this._ev || {})[t] = fn; };
Node.prototype.fire = function (t, e) { if (this._ev && this._ev[t]) return this._ev[t](e || { preventDefault: function () {} }); };
Node.prototype.focus = function () {};
Node.prototype.showModal = function () {
  if (this.open) throw new Error('InvalidStateError: 이미 열린 창을 또 열었다');
  this.open = true; this.attrs.open = true;
};
Node.prototype.close = function () { this.open = false; this.attrs.open = false; };
Node.prototype.matches = function () { return false; };
Node.prototype.querySelector = function (sel) {
  var want = sel.replace('.', '');
  for (var i = 0; i < this.children.length; i++) {
    var c = this.children[i];
    if (typeof c === 'string') continue;
    if (c.has(want)) return c;
    var deep = c.querySelector(sel);
    if (deep) return deep;
  }
  return null;
};
Node.prototype.remove = function () {};
Node.prototype.dump = function (d) {
  d = d || 0;
  var pad = new Array(d + 1).join('  ');
  var line = pad + this.tag + (this._cls ? '.' + this._cls.split(' ').join('.') : '');
  if (this.attrs.hidden) line += ' [hidden]';
  if (this.text != null) line += '  "' + this.text + '"';
  var out = [line];
  for (var i = 0; i < this.children.length; i++) {
    var c = this.children[i];
    out.push(typeof c === 'string' ? pad + '  "' + c + '"' : c.dump(d + 1));
  }
  return out.join('\n');
};

var IDS = ['topbar', 'schoolName', 'schoolOffice', 'btnAllergen', 'btnSettings', 'setup', 'searchForm',
  'searchInput', 'searchStatus', 'searchResults', 'searchHint', 'app', 'hero', 'btnPrev', 'rangeLabel',
  'btnNext', 'btnToday', 'btnWeek', 'btnMonth', 'btnPrint', 'status', 'board', 'legend', 'settings', 'feedbackDialog', 'btnFeedback', 'btnCloseFeedback',
  'feedback', 'feedbackForm', 'fbSchool', 'fbMessage', 'fbName', 'fbList', 'fbSubmit', 'fbStatus',
  'curSchool', 'btnChangeSchool', 'keyInput', 'btnSaveKey', 'cacheInfo', 'btnClearCache', 'adminInput', 'btnSaveAdmin', 'btnExitAdmin', 'adminNote', 'btnCloseSettings'];
var byId = {};
IDS.forEach(function (id) { byId[id] = new Node('#' + id); });

var document = {
  getElementById: function (id) { if (!byId[id]) throw new Error('없는 엘리먼트: ' + id); return byId[id]; },
  createElement: function (t) { return new Node(t); },
  addEventListener: function () {},
  body: new Node('body'),
  title: ''
};
var SW = { registered: [] };
var navigator = { serviceWorker: { register: function (p) { SW.registered.push(p); return Promise.resolve({}); } } };
var location = { protocol: 'https:', origin: 'https://example.netlify.app' };
var window = {
  print: function () {},
  addEventListener: function (t, fn) { if (t === 'load') fn(); }
};

var store = {};
var localStorage = {
  getItem: function (k) { return k in store ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; },
  key: function (i) { return Object.keys(store)[i]; },
  get length() { return Object.keys(store).length; }
};
store['meal.school'] = JSON.stringify({ name: '서울고등학교', office: '서울특별시교육청', atpt: 'B10', code: '7010083' });
store['meal.allergen'] = '1';

function USP(obj) {
  var pairs = Object.keys(obj).map(function (k) { return [k, String(obj[k])]; });
  this.set = function (k, v) { pairs.push([k, String(v)]); };
  this.toString = function () {
    return pairs.map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
  };
}

var SCHOOLS = [
  { SCHUL_NM: '서울고등학교', SCHUL_KND_SC_NM: '고등학교', ATPT_OFCDC_SC_NM: '서울특별시교육청',
    ATPT_OFCDC_SC_CODE: 'B10', SD_SCHUL_CODE: '7010083', ORG_RDNMA: '서울특별시 서초구 효령로 197' },
  { SCHUL_NM: '서울고등학교부설방송통신고등학교', SCHUL_KND_SC_NM: '고등학교', ATPT_OFCDC_SC_NM: '서울특별시교육청',
    ATPT_OFCDC_SC_CODE: 'B10', SD_SCHUL_CODE: '7010999', ORG_RDNMA: '서울특별시 서초구 효령로 197' }
];

var CALLS = [], POSTS = [], POST_FAILS = false;
var BOARD = [{ id: 'a1', name: '3학년 김', message: '석식도 보여줘서 좋아요', at: '2026-08-17T02:00:00.000Z' }];
var SEQ = 0;
function boardRes(body, status) {
  return Promise.resolve({ ok: status < 400, status: status, json: function () { return Promise.resolve(body); } });
}
function fetch(url, opts) {
  if (url.indexOf('/api/feedback') === 0) {
    var m = (opts && opts.method) || 'GET';
    if (m === 'GET') {
      if (opts && opts.headers && opts.headers['x-admin-key'] === 'secret123') {
        return boardRes({ entries: BOARD.slice().reverse(), admin: true }, 200);
      }
      var who = url.indexOf('author=') >= 0 ? decodeURIComponent(url.split('author=')[1]) : '';
      var mine = BOARD.filter(function (x) { return who && x.author === who; });
      return boardRes({ entries: mine.reverse() }, 200);
    }
    if (m === 'PATCH') {
      if (opts.headers['x-admin-key'] !== 'secret123') return boardRes({ error: '관리자만 답장할 수 있습니다.' }, 403);
      var pid = decodeURIComponent(url.split('id=')[1]);
      var t = BOARD.filter(function (x) { return x.id === pid; })[0];
      if (!t) return boardRes({ error: '이미 지워진 의견입니다.' }, 404);
      var rt = JSON.parse(opts.body).reply;
      if (rt) t.reply = { text: rt, at: '2026-08-17T06:00:00.000Z' }; else delete t.reply;
      return boardRes({ entry: t }, 200);
    }
    if (m === 'POST') {
      var b = JSON.parse(opts.body);
      if (POST_FAILS) return boardRes({ error: '방금 같은 의견을 보내셨습니다.' }, 429);
      var e = { author: JSON.parse(opts.body).author, id: 'new' + (++SEQ), name: b.name || '익명', message: b.message, school: b.school, at: '2026-08-17T05:00:00.000Z' };
      BOARD.push(e);
      POSTS.push({ url: url, body: opts.body });
      return boardRes({ entry: e }, 200);
    }
    if (m === 'DELETE') {
      if (opts.headers['x-admin-key'] !== 'secret123') return boardRes({ error: '관리자 키가 맞지 않습니다.' }, 403);
      var id = url.split('id=')[1];
      BOARD = BOARD.filter(function (x) { return x.id !== decodeURIComponent(id); });
      return boardRes({ ok: true }, 200);
    }
  }
  if (opts && opts.method === 'POST') {
    POSTS.push({ url: url, body: opts.body, ct: opts.headers['Content-Type'] });
    return POST_FAILS ? Promise.reject(new Error('오프라인')) : Promise.resolve({ ok: true, status: 200 });
  }
  CALLS.push(url);
  var q = {};
  url.split('?')[1].split('&').forEach(function (p) { var kv = p.split('='); q[kv[0]] = decodeURIComponent(kv[1]); });

  if (url.indexOf('schoolInfo') >= 0) {
    var found = SCHOOLS.filter(function (s) { return s.SCHUL_NM.indexOf(q.SCHUL_NM) >= 0; });
    var sBody = found.length
      ? { schoolInfo: [{ head: [{ list_total_count: found.length }, { RESULT: { CODE: 'INFO-000' } }] }, { row: found }] }
      : { RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } };
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(sBody); } });
  }

  var from = q.MLSV_FROM_YMD, to = q.MLSV_TO_YMD;
  var hit = FIXTURE.filter(function (r) { return r.MLSV_YMD >= from && r.MLSV_YMD <= to; });
  var total = hit.length;
  var rows = hit.slice(0, 5);                       // 인증키 없을 때의 5건 제한을 그대로 재현
  var body = total
    ? { mealServiceDietInfo: [{ head: [{ list_total_count: total }, { RESULT: { CODE: 'INFO-000', MESSAGE: '정상 처리되었습니다.' } }] }, { row: rows }] }
    : { RESULT: { CODE: 'INFO-200', MESSAGE: '해당하는 데이터가 없습니다.' } };
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(body); } });
}

// 앱 실행
try {
  new Function('document', 'window', 'localStorage', 'fetch', 'URLSearchParams', 'navigator', 'location', APP)(
    document, window, localStorage, fetch, USP, navigator, location);
} catch (e) {
  print('❌ 실행 중 예외: ' + e + '\n' + (e.stack || ''));
  throw e;
}

for (var i = 0; i < 40; i++) drainMicrotasks();

print('── 요청 ' + CALLS.length + '건 ' + '─'.repeat(40));
CALLS.forEach(function (u) {
  var m = u.match(/MLSV_FROM_YMD=(\d+)&MLSV_TO_YMD=(\d+)/);
  print('   ' + m[1] + ' ~ ' + m[2]);
});
print('\n── 화면 상태 ' + '─'.repeat(38));
print('   문서 제목: ' + document.title);
print('   학교: ' + byId.schoolName.textContent + ' / ' + byId.schoolOffice.textContent);
print('   setup hidden=' + byId.setup.hidden + ', app hidden=' + byId.app.hidden + ', topbar hidden=' + byId.topbar.hidden);
print('   기간: ' + byId.rangeLabel.textContent);
print('   상태줄: "' + (byId.status.children.length ? byId.status.children[0].dump().replace(/\n/g, ' | ') : '(비어있음)') + '"');
print('\n── 오늘 카드 ' + '─'.repeat(38));
print(byId.hero.children.length ? byId.hero.children[0].dump(1) : '   (비어있음)');
print('\n── 급식판 ' + '─'.repeat(40));
print(byId.board.children.length ? byId.board.children[0].dump(1) : '   (비어있음)');
print('\n── 서비스워커 ' + '─'.repeat(36));
print('   등록 요청: ' + (SW.registered.length ? SW.registered.join(', ') : '(없음)'));
print('\n── 범례 ' + '─'.repeat(42));
print('   ' + byId.legend.dump().replace(/\n/g, '\n   '));

// ── 시나리오 ─────────────────────────────────
function settle() { for (var i = 0; i < 60; i++) drainMicrotasks(); }
function summarize(node) {
  var out = [];
  (node.children[0] || { children: [] }).children.forEach(function (c) {
    if (typeof c === 'string' || c.has('blank')) return;
    var head = c.children[0], label = '', dishes = 0, meals = [];
    if (head && head.children) {
      label = head.children.map(function (x) { return typeof x === 'string' ? x : x.textContent; }).join(' ');
    }
    c.children.slice(1).forEach(function (m) {
      if (m.tag === 'div' && m.has('meal')) {
        m.children.forEach(function (x) {
          if (x.has && x.has('meal-tag')) meals.push(x.textContent);
          if (x.has && x.has('dishes')) dishes += x.children.length;
        });
      }
    });
    out.push('     ' + label.padEnd(10) + (dishes ? meals.join('/') + ' 메뉴 ' + dishes + '개' : '(급식 없음)'));
  });
  return out.join('\n');
}

print('\n\n═══ 시나리오 1: 다음 주 보기 (› 클릭) ' + '═'.repeat(20));
var n0 = CALLS.length;
byId.btnNext.fire('click'); settle();
print('   기간: ' + byId.rangeLabel.textContent + '  (요청 ' + (CALLS.length - n0) + '회 추가)');
print(summarize(byId.board));

print('\n═══ 시나리오 2: 같은 주 다시 (‹ 후 ›, 캐시 확인) ' + '═'.repeat(10));
n0 = CALLS.length;
byId.btnPrev.fire('click'); settle();
byId.btnNext.fire('click'); settle();
print('   기간: ' + byId.rangeLabel.textContent + '  (요청 ' + (CALLS.length - n0) + '회 추가 — 0이면 캐시 적중)');

print('\n═══ 시나리오 3: 월간 보기 ' + '═'.repeat(28));
n0 = CALLS.length;
byId.btnMonth.fire('click'); settle();
print('   기간: ' + byId.rangeLabel.textContent + '  (요청 ' + (CALLS.length - n0) + '회 추가)');
var month = byId.board.children[0];
print('   격자 칸 수: ' + month.children.length + ' (요일머리 7 + 빈칸 + 날짜)');
print('   요일 머리: ' + month.children.slice(0, 7).map(function (c) { return c.textContent; }).join(' '));
var filled = month.children.filter(function (c) { return c.has && c.has('day') && !c.has('blank') && c.children.length > 1; });
print('   급식 있는 날: ' + filled.length + '일');
print('   첫 급식일 카드:\n' + (filled[0] ? filled[0].dump(3) : '없음'));

print('\n═══ 시나리오 4: 알레르기 표시 끄기 ' + '═'.repeat(24));
byId.btnAllergen.fire('click'); settle();
print('   body class: "' + document.body.className + '"  / 버튼 aria-pressed=' + byId.btnAllergen.getAttribute('aria-pressed'));
print('   범례 hidden=' + byId.legend.hidden);

print('\n═══ 시나리오 5: 설정 → 학교 바꾸기 → 검색 ' + '═'.repeat(18));
byId.btnSettings.fire('click'); settle();
print('   설정 열림=' + byId.settings.getAttribute('open') + ' / 현재 학교: ' + byId.curSchool.textContent);
print('   캐시 안내: ' + byId.cacheInfo.textContent);
byId.btnChangeSchool.fire('click'); settle();
print('   설정 닫힘=' + (byId.settings.getAttribute('open') === false) + ' / setup 보임=' + !byId.setup.hidden);
byId.searchInput.value = '서울고등학교';
byId.searchForm.fire('submit'); settle();
print('   검색 결과 ' + byId.searchResults.children.length + '건:');
byId.searchResults.children.forEach(function (li) {
  print('     · ' + li.children[0].children.map(function (d) { return d.textContent; }).join('  |  '));
});
print('\n═══ 시나리오 6: 없는 학교 검색 ' + '═'.repeat(26));
byId.searchInput.value = '없는학교';
byId.searchForm.fire('submit'); settle();
print('   ' + byId.searchStatus.dump().replace(/\n/g, ' '));

function board() {
  return byId.fbList.children.map(function (li) {
    if (li.has('fb-empty')) return '     (' + li.textContent + ')';
    var head = li.children[0], text = li.children[1];
    var name = head.children[0].textContent, when = head.children[1].textContent;
    var del = head.children[2] ? '  [지우기]' : '';
    return '     ' + name + ' · ' + when + del + '\n       ' + text.textContent;
  }).join('\n');
}

print('\n═══ 시나리오 7: 의견 버튼 → 창 열기 ' + '═'.repeat(20));
print('   열기 전 목록 비어있음: ' + (byId.fbList.children.length === 0));
byId.btnFeedback.fire('click'); settle();
print('   창 열림: ' + (byId.feedbackDialog.getAttribute('open') === true));
print('   불러온 글:');
print(board());

print('\n═══ 시나리오 8: 의견 남기기 ' + '═'.repeat(28));
byId.fbMessage.value = '월간 보기에서 글씨가 너무 작아요';
byId.fbName.value = '2학년 박';
byId.feedbackForm.fire('submit'); settle();
print('   안내문: "' + byId.fbStatus.textContent + '" (' + byId.fbStatus.className + ')');
print('   보낸 내용: ' + POSTS[POSTS.length - 1].body);
print('   입력칸 비워짐: ' + (byId.fbMessage.value === ''));
print('   목록:');
print(board());

print('\n═══ 시나리오 9: 중복 전송 거절 ' + '═'.repeat(26));
POST_FAILS = true;
byId.fbMessage.value = '같은 말 또 보내기';
byId.feedbackForm.fire('submit'); settle();
print('   안내문: "' + byId.fbStatus.textContent + '" (' + byId.fbStatus.className + ')');
print('   쓴 내용 보존: ' + (byId.fbMessage.value === '같은 말 또 보내기'));
POST_FAILS = false;

print('\n═══ 시나리오 10: 관리자 키 없이는 지우기 버튼 없음 ' + '═'.repeat(8));
print('   지우기 버튼 있음: ' + (board().indexOf('[지우기]') >= 0));

print('\n═══ 시나리오 11: 관리자 키 저장 후 삭제 ' + '═'.repeat(18));
byId.adminInput.value = 'secret123';
byId.btnSaveAdmin.fire('click'); settle();
print('   지우기 버튼 나타남: ' + (board().indexOf('[지우기]') >= 0));
var first = byId.fbList.children[0].children[0];
first.children[2].fire('click'); settle();
print('   안내문: "' + byId.fbStatus.textContent + '" (' + byId.fbStatus.className + ')');
print('   남은 글 수: ' + BOARD.length);
print(board());

print('\n═══ 시나리오 12: 창 닫기 ' + '═'.repeat(30));
byId.btnCloseFeedback.fire('click'); settle();
print('   창 닫힘: ' + (byId.feedbackDialog.getAttribute('open') === false));

function board() {
  return byId.fbList.children.map(function (li) {
    if (li.has('fb-empty')) return '     (' + li.textContent + ')';
    var head = li.children[0];
    var btns = head.children.slice(2).map(function (b) { return '[' + b.textContent + ']'; }).join('');
    var out = '     ' + head.children[0].textContent + ' · ' + head.children[1].textContent + ' ' + btns +
              '\n       ' + li.children[1].textContent;
    var rep = li.children[2];
    if (rep && rep.has('fb-reply')) out += '\n       ↳ 답장: ' + rep.children[1].textContent;
    return out;
  }).join('\n');
}

print('\n═══ 시나리오 13: 손님이 자기 글만 본다 ' + '═'.repeat(18));
store['meal.admin'] = undefined; delete store['meal.admin'];
BOARD = [{ id: 'other1', author: 'someone-else', name: '남', message: '남이 쓴 글', at: '2026-08-17T02:00:00.000Z' }];
byId.btnFeedback.fire('click'); settle();
print('   글 남기기 전:');
print(board());
byId.fbMessage.value = '월간 보기 글씨가 작아요';
byId.fbName.value = '나';
byId.feedbackForm.fire('submit'); settle();
print('   내 글 남긴 뒤:');
print(board());
print('   서버에 쌓인 전체: ' + BOARD.length + '개 (남의 글은 화면에 안 나옴)');

print('\n═══ 시나리오 14: 관리자가 답장 ' + '═'.repeat(26));
byId.btnCloseFeedback.fire('click'); settle();
byId.adminInput.value = 'secret123';
byId.btnSaveAdmin.fire('click'); settle();
byId.btnFeedback.fire('click'); settle();
print('   관리자가 보는 목록:');
print(board());
var mine = byId.fbList.children[0];
mine.children[0].children[2].fire('click');    // [답장]
var form = mine.children[mine.children.length - 1];
form.children[0].value = '다음에 글씨 크기 조절 넣겠습니다.';
form.fire('submit'); settle();
print('   답장 뒤: ' + byId.fbStatus.textContent);
print(board());

print('\n═══ 시나리오 15: 손님이 답장을 확인 ' + '═'.repeat(20));
byId.btnCloseFeedback.fire('click'); settle();
byId.btnExitAdmin.fire('click'); settle();
byId.btnFeedback.fire('click'); settle();
print(board());
