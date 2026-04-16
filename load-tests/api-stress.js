/**
 * k6 Load Test — API Health & General Stress
 *
 * Runs a broad sweep of all major API endpoints simultaneously.
 * Useful for finding which endpoint degrades first under load.
 *
 * Run:
 *  k6 run load-tests/api-stress.js \
 *     -e API_URL=https://hi-test.up.railway.app \
 *     -e JWT=eyJ...your.token...
 *
 *  With summary output:
 *  k6 run --out json=results.json load-tests/api-stress.js ...
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "20s", target: 20 },
    { duration: "40s", target: 50 },
    { duration: "60s", target: 100 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<4000"],
    error_rate: ["rate<0.05"],
  },
};

const API_URL = __ENV.API_URL || "https://hi-test.up.railway.app";
const JWT = __ENV.JWT || "";

const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${JWT}`,
};

export default function () {
  // Health check (no auth)
  group("GET /health", () => {
    const res = http.get(`${API_URL}/health`);
    const ok = check(res, { "health: 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.2);

  // User profile
  group("GET /users/me", () => {
    const res = http.get(`${API_URL}/users/me`, { headers: HEADERS });
    const ok = check(res, { "users/me: 200 or 401": (r) => r.status === 200 || r.status === 401 });
    errorRate.add(!ok);
  });

  sleep(0.2);

  // Papers list
  group("GET /papers", () => {
    const res = http.get(`${API_URL}/papers`, { headers: HEADERS });
    const ok = check(res, { "papers: 200 or 401": (r) => r.status === 200 || r.status === 401 });
    errorRate.add(!ok);
  });

  sleep(0.2);

  // Attempt count
  group("GET /papers/attempt/count", () => {
    const res = http.get(`${API_URL}/papers/attempt/count`, { headers: HEADERS });
    const ok = check(res, { "attempt count: 200 or 401": (r) => r.status === 200 || r.status === 401 });
    errorRate.add(!ok);
  });

  sleep(0.2);

  // Point rules (public)
  group("GET /api/point-rules", () => {
    const res = http.get(`${API_URL}/api/point-rules`);
    const ok = check(res, { "point-rules: 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(1);
}
