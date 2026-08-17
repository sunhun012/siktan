// 의견 게시판. 누구나 읽고 쓸 수 있고, 관리자 키를 가진 사람만 지울 수 있다.
// 저장은 Netlify Blobs를 쓴다 (별도 데이터베이스 없이 사이트에 딸려온다).
import { getStore } from '@netlify/blobs';

const KEY = 'entries';
const MAX_MESSAGE = 500;
const MAX_NAME = 20;
const KEEP = 300;          // 보관할 최대 의견 수

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const clean = (v, max) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export default async (req) => {
  // consistency: 'strong' — 방금 남긴 글이 바로 읽히도록. 기본값이면 최대 1분 늦게 보인다.
  const store = getStore({ name: 'feedback', consistency: 'strong' });
  const read = async () => (await store.get(KEY, { type: 'json' })) || [];

  // 남긴 글은 관리자만 읽는다. 화면에서 숨기는 것만으로는 주소를 아는 사람이
  // 그대로 받아볼 수 있으므로, 여기서 막는다.
  if (req.method === 'GET') {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      return json({ error: 'ADMIN_KEY가 설정되지 않아 의견을 볼 수 없습니다.' }, 501);
    }
    if (req.headers.get('x-admin-key') !== adminKey) {
      return json({ error: '관리자만 볼 수 있습니다.' }, 403);
    }
    const entries = await read();
    return json({ entries: entries.slice().reverse() });   // 최신 글이 위로
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
    return json({ entry });
  }

  if (req.method === 'DELETE') {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return json({ error: '삭제 기능이 설정되지 않았습니다.' }, 501);
    if (req.headers.get('x-admin-key') !== adminKey) return json({ error: '관리자 키가 맞지 않습니다.' }, 403);

    const id = new URL(req.url).searchParams.get('id');
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
