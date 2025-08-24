// scripts/k6/conversations-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

// ====== Config via env ======
// BASE_URL: http://localhost:3000
// USER_IDS: danh sách ObjectId, phân tách bằng dấu phẩy (bắt buộc)
// LIMIT:    số item mỗi trang (mặc định 20)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const LIMIT = Number(__ENV.LIMIT || 20)
const USERS = (__ENV.USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

if (!USERS.length) {
  throw new Error('Please provide USER_IDS env, e.g. -e USER_IDS=6898...,6899...')
}

export const options = {
  // Read-heavy: 100 req/s trong 1 phút (tùy chỉnh)
  scenarios: {
    read_heavy: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 100), // req/s
      timeUnit: '1s',
      duration: __ENV.DURATION || '1m',
      preAllocatedVUs: Number(__ENV.VUS || 50),
      maxVUs: Number(__ENV.MAX_VUS || 200),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],       // <1% lỗi
    http_req_duration: ['p(95)<200', 'p(99)<400'], // p95 <200ms local/prod tùy chỉnh
  },
  // gắn tag để lọc theo route
  tags: { route: '/v1/chat/conversations' },
}

export default function () {
  // chọn 1 user ngẫu nhiên (giả lập nhiều người dùng)
  const uid = USERS[Math.floor(Math.random() * USERS.length)]

  const url = `${BASE_URL}/v1/chat/conversations?limit=${LIMIT}`
  const res = http.get(url, {
    headers: { 'x-dev-user': uid }, // dev-auth header
    tags: { name: 'GET /v1/chat/conversations' },
  })

  // xác nhận cơ bản
  const ok = check(res, {
    'status 200': r => r.status === 200,
    'has rows array': r => {
      try {
        const body = r.json()
        return body && Array.isArray(body.rows)
      } catch { return false }
    },
  })

  // (tùy chọn) lấy nextCursor để bắt chéo nhiều trang
  // NOTE: để nhẹ nhàng cho read-heavy, giữ 1 request/iteration là đủ
  // const body = res.json()
  // if (ok && body?.nextCursor) {
  //   http.get(`${url}&cursor=${encodeURIComponent(body.nextCursor)}`, {
  //     headers: { 'x-dev-user': uid },
  //     tags: { name: 'GET /v1/chat/conversations?page=2' },
  //   })
  // }

  // “think time” nhỏ để mô phỏng client
  sleep(Number(__ENV.SLEEP || 0.2))
}
