// 의견 게시판.
//  - 누구나 글을 남길 수 있다
//  - 글쓴이는 자기가 남긴 글과 그에 달린 답장만 볼 수 있다 (기기에 저장된 작성자 표식으로 찾는다)
//  - 관리자만 전체를 보고, 답장하고, 지울 수 있다
// 저장은 Netlify Blobs를 쓴다 (별도 데이터베이스 없이 사이트에 딸려온다).
import { getStore } from '@netlify/blobs';

const KEY = 'entries';
const MAX_MESSAGE = 500;
const MAX_NAME = 20;
const MAX_REPLY = 500;
const KEEP = 300;          // 보관할 최대 의견 수

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const clean = (v, max) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const isAdmin = (req) => {
  const key = process.env.ADMIN_KEY;
  return !!key && req.headers.get('x-admin-key') === key;
};

// 작성자 표식은 밖으로 내보내지 않는다.
const strip = ({ author, ...rest }) => rest;

export default async (req) => {
  // consistency: 'strong' — 방금 남긴 글이 바로 읽히도록. 기본값이면 최대 1분 늦게 보인다.
  const store = getStore({ name: 'feedback', consistency: 'strong' });
  const read = async () => (await store.get(KEY, { type: 'json' })) || [];
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const entries = await read();

    if (isAdmin(req)) {
      return json({ entries: entries.slice().reverse().map(strip), admin: true });
    }

    // 관리자가 아니면 자기가 남긴 글만 돌려준다.
    const author = clean(url.searchParams.get('author'), 64);
    if (!author) return json({ entries: [] });

    const mine = entries.filter((e) => e.author && e.author === author);
    return json({ entries: mine.reverse().map(strip) });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: '내용을 읽지 못했습니다.' }, 400);
    }

    const message = clean(body.message, MAX_MESSAGE);
    if (!message) return json({ error: '의견을 입력해 주세요.' }, 400);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: clean(body.name, MAX_NAME) || '익명',
      message,
      school: clean(body.school, 40),
      author: clean(body.author, 64),
      at: new Date().toISOString()
    };

    const entries = await read();
    // 같은 내용을 연달아 여러 번 보내는 것은 막는다.
    const last = entries[entries.length - 1];
    if (last && last.message === entry.message && Date.now() - Date.parse(last.at) < 60_000) {
      return json({ error: '방금 같은 의견을 보내셨습니다.' }, 429);
    }

    entries.push(entry);
    await store.setJSON(KEY, entries.slice(-KEEP));
    return json({ entry: strip(entry) });
  }

  // 답장 달기 (관리자만)
  if (req.method === 'PATCH') {
    if (!process.env.ADMIN_KEY) return json({ error: '답장 기능이 설정되지 않았습니다.' }, 501);
    if (!isAdmin(req)) return json({ error: '관리자만 답장할 수 있습니다.' }, 403);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: '내용을 읽지 못했습니다.' }, 400);
    }

    const id = url.searchParams.get('id');
    const text = clean(body.reply, MAX_REPLY);
    if (!id) return json({ error: '답장할 의견을 지정해 주세요.' }, 400);

    const entries = await read();
    const target = entries.find((e) => e.id === id);
    if (!target) return json({ error: '이미 지워진 의견입니다.' }, 404);

    if (text) target.reply = { text, at: new Date().toISOString() };
    else delete target.reply;      // 빈 답장은 지우기로 본다

    await store.setJSON(KEY, entries);
    return json({ entry: strip(target) });
  }

  if (req.method === 'DELETE') {
    if (!process.env.ADMIN_KEY) return json({ error: '삭제 기능이 설정되지 않았습니다.' }, 501);
    if (!isAdmin(req)) return json({ error: '관리자 키가 맞지 않습니다.' }, 403);

    const id = url.searchParams.get('id');
    if (!id) return json({ error: '지울 의견을 지정해 주세요.' }, 400);

    const entries = await read();
    const left = entries.filter((e) => e.id !== id);
    if (left.length === entries.length) return json({ error: '이미 지워진 의견입니다.' }, 404);

    await store.setJSON(KEY, left);
    return json({ ok: true });
  }

  return json({ error: '지원하지 않는 요청입니다.' }, 405);
};

export const config = { path: '/api/feedback' };
