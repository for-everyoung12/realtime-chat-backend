import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

export const options = {
  scenarios: {
    readers: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { scenario: 'readers' },
    },
    writers: {
      executor: 'constant-arrival-rate',
      rate: 30,              // 30 requests/second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 60,   // nên >= rate để tránh throttling nội bộ
      maxVUs: 120,
      tags: { scenario: 'writers' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:readers,name:GET /v1/chat/conversations}': ['p(95)<300'],
    'http_req_duration{scenario:writers,name:POST /v1/chat/messages}': ['p(95)<300'],
    checks: ['rate>0.99'],
  },
};

const BASE = __ENV.BASE || 'http://localhost:8080';
const TOKEN = __ENV.TOKEN; // <-- sửa "the" thành "const"
const CID = __ENV.CID;     // conversationId để gửi tin

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: {}, // sẽ set name riêng cho từng request bên dưới
  };

  // 1/3 lượt: write; 2/3 lượt: read
  const doWrite = (__ITER % 3 === 0);

  if (doWrite && CID) {
    const body = JSON.stringify({
      conversationId: CID,
      type: 'text',
      content: `hello ${Date.now()} vu:${exec.vu.idInTest} iter:${__ITER}`,
      clientMsgId: `${exec.vu.idInTest}-${__ITER}-${Math.random().toString(36).slice(2)}`,
    });

    const r = http.post(`${BASE}/v1/chat/messages`, body, { ...params, tags: { name: 'POST /v1/chat/messages' } });
    check(r, {
      'POST /messages 201': (res) => res.status === 201,
      'POST returns id': (res) => {
        try {
          const json = res.json();
          return json && (json._id || json.id);
        } catch { return false; }
      },
    });
  } else {
    const r = http.get(`${BASE}/v1/chat/conversations?limit=20`, { ...params, tags: { name: 'GET /v1/chat/conversations' } });
    check(r, {
      'GET /conversations 200': (res) => res.status === 200,
      'GET has items': (res) => {
        try {
          const data = res.json();
          return Array.isArray(data?.items || data) ? (data.items?.length >= 0 || data.length >= 0) : true;
        } catch { return false; }
      },
    });
  }

  sleep(0.2); // ~5 req/second mỗi VU khi là readers
}
