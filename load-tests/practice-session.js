/**
 * k6 Load Test — Practice Session (50 concurrent students)
 *
 * Simulates 50 students each:
 *  1. Fetching their existing papers
 *  2. Generating a practice paper preview
 *  3. Starting and completing a practice attempt
 *
 * Prerequisites:
 *  brew install k6
 *
 * Run:
 *  k6 run load-tests/practice-session.js \
 *     -e API_URL=https://hi-test.up.railway.app \
 *     -e JWT=eyJ...your.token.here...
 *
 * For a bigger ramp:
 *  k6 run --vus 100 --duration 60s load-tests/practice-session.js ...
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ─── Custom metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate("error_rate");
const paperFetchDuration = new Trend("paper_fetch_ms", true);
const previewDuration = new Trend("preview_ms", true);
const attemptDuration = new Trend("attempt_ms", true);

// ─── Load shape: ramp up → hold → ramp down ────────────────────────────────────
export const options = {
  stages: [
    { duration: "30s", target: 10 },   // ramp up to 10 users
    { duration: "30s", target: 50 },   // ramp up to 50 users
    { duration: "60s", target: 50 },   // hold at 50 users for 1 minute
    { duration: "20s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],       // < 5% errors
    http_req_duration: ["p(95)<3000"],    // 95% of requests under 3 seconds
    error_rate: ["rate<0.05"],
    paper_fetch_ms: ["p(95)<2000"],
    preview_ms: ["p(95)<3000"],
    attempt_ms: ["p(95)<2000"],
  },
};

const API_URL = __ENV.API_URL || "https://hi-test.up.railway.app";
const JWT = __ENV.JWT || "";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JWT}`,
  };
}

// ─── Main virtual user scenario ───────────────────────────────────────────────
export default function () {
  // Step 1: Fetch existing papers
  group("GET /papers — list papers", () => {
    const start = Date.now();
    const res = http.get(`${API_URL}/papers`, { headers: authHeaders() });
    paperFetchDuration.add(Date.now() - start);

    const ok = check(res, {
      "papers list: status 200": (r) => r.status === 200,
      "papers list: response is JSON": (r) => r.headers["Content-Type"]?.includes("application/json"),
    });
    errorRate.add(!ok);
    sleep(0.5);
  });

  // Step 2: Generate a paper preview (simulates filling out the paper creation form)
  group("POST /papers/preview — generate questions", () => {
    const payload = JSON.stringify({
      rows: 3,
      digits: 2,
      negatives: false,
      questions: 20,
      level: "junior",
    });

    const start = Date.now();
    const res = http.post(`${API_URL}/papers/preview`, payload, {
      headers: authHeaders(),
    });
    previewDuration.add(Date.now() - start);

    const ok = check(res, {
      "preview: status 200": (r) => r.status === 200,
      "preview: has questions": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.questions) && body.questions.length > 0;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
    sleep(1);
  });

  // Step 3: Submit a practice attempt (score = random realistic result)
  group("POST /papers/attempt — submit attempt", () => {
    const score = Math.floor(Math.random() * 15) + 5;  // 5-20 correct out of 20
    const payload = JSON.stringify({
      paper_id: null,    // inline attempt, no saved paper ID
      score: score,
      total: 20,
      time_taken: Math.floor(Math.random() * 120) + 30,  // 30-150 seconds
      level: "junior",
      mode: "practice",
    });

    const start = Date.now();
    const res = http.post(`${API_URL}/papers/attempt`, payload, {
      headers: authHeaders(),
    });
    attemptDuration.add(Date.now() - start);

    const ok = check(res, {
      "attempt: status 200 or 201": (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!ok);
    sleep(1);
  });

  sleep(2);  // think time between full scenario loops
}
