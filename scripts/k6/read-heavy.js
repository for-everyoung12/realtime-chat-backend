import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 80,
  duration: '5m',
  thresholds: { http_req_duration: ['p(95)<250'] }
}

const BASE = __ENV.BASE || 'http://localhost:8080'
const TOKEN = __ENV.TOKEN // Bearer token (JWT)

export default function () {
  const params = { headers: { Authorization: `Bearer ${TOKEN}` } }

  const r1 = http.get(`${BASE}/v1/chat/conversations?limit=20`, params)
  check(r1, { 'GET /conversations 200': (r) => r.status === 200 })

  const convs = r1.json('rows') || []
  if (convs.length) {
    const cid = convs[0]._id
    const r2 = http.get(`${BASE}/v1/chat/messages?conversationId=${cid}&limit=50`, params)
    check(r2, { 'GET /messages 200': (r) => r.status === 200 })
  }

  sleep(0.3)
}
