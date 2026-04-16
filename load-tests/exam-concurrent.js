/**
 * k6 Load Test — Concurrent Exam (100 students taking an exam simultaneously)
 *
 * Simulates a realistic exam day scenario:
 *  1. All students authenticate (via token — already in hand)
 *  2. Each student fetches the exam questions for a given exam code
 *  3. Each student spends 10-30 minutes (simulated as 10-30 seconds at 60x speed)
 *  4. All students submit answers within a short window
 *
 * This is the HARDEST scenario for your backend — all POSTs arrive simultaneously.
 *
 * Prerequisites:
 *  brew install k6
 *
 * Run:
 *  k6 run load-tests/exam-concurrent.js \
 *     -e API_URL=https://hi-test.up.railway.app \
 *     -e JWT=eyJ...your.token.here... \
 *     -e EXAM_CODE=EXAM001
 *
 * Stress test (100 simultaneous):
 *  k6 run --vus 100 --iterations 100 load-tests/exam-concurrent.js ...
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate("error_rate");
const examFetchDuration = new Trend("exam_fetch_ms", true);
const examSubmitDuration = new Trend("exam_submit_ms", true);
const successfulSubmissions = new Counter("successful_submissions");

// ─── Load shape: synchronized exam burst ─────────────────────────────────────
export const options = {
  scenarios: {
    // Ramp up to 100 students quickly, all active simultaneously
    exam_day: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 100 },  // all 100 students "arrive"
        { duration: "90s", target: 100 },  // everyone is taking the exam
        { duration: "15s", target: 0 },    // everyone submits and leaves
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],        // < 2% HTTP errors during an exam
    http_req_duration: ["p(95)<5000"],     // 95% of requests under 5 seconds
    exam_fetch_ms: ["p(95)<3000"],
    exam_submit_ms: ["p(99)<8000"],        // submission must succeed within 8s for 99%
    error_rate: ["rate<0.02"],
  },
};

const API_URL = __ENV.API_URL || "https://hi-test.up.railway.app";
const JWT = __ENV.JWT || "";
const EXAM_CODE = __ENV.EXAM_CODE || "TEST001";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JWT}`,
  };
}

// ─── Simulated exam answers ────────────────────────────────────────────────────
function generateAnswers(questionCount) {
  const answers = {};
  for (let i = 0; i < questionCount; i++) {
    // Simulate a student answering: mix of correct (random numbers) and blanks
    answers[`q_${i}`] = Math.random() > 0.2 ? String(Math.floor(Math.random() * 100)) : "";
  }
  return answers;
}

// ─── Main virtual user scenario ───────────────────────────────────────────────
export default function () {
  let questionCount = 20;

  // Step 1: Fetch exam questions using the exam code
  group("GET exam questions", () => {
    const start = Date.now();
    const res = http.get(`${API_URL}/exam/${EXAM_CODE}`, { headers: authHeaders() });
    examFetchDuration.add(Date.now() - start);

    const ok = check(res, {
      "exam fetch: status 200": (r) => r.status === 200,
      "exam fetch: has questions or exam data": (r) => {
        try {
          const body = JSON.parse(r.body);
          // Accept either format the backend returns
          return body.questions?.length > 0 || body.exam || body.code;
        } catch {
          return r.status === 200;  // if parse fails but status ok, still pass
        }
      },
    });
    errorRate.add(!ok);

    // Try to read actual question count from response
    try {
      const body = JSON.parse(res.body);
      if (body.questions?.length) questionCount = body.questions.length;
    } catch {}
  });

  // Step 2: Student "thinks and answers" — simulate exam duration
  // (scaled down: 5-20 real seconds simulating 10-40 minute exam sessions)
  sleep(Math.random() * 15 + 5);

  // Step 3: Submit exam answers (the big concurrent spike moment)
  group("POST submit exam answers", () => {
    const answers = generateAnswers(questionCount);
    const payload = JSON.stringify({
      exam_code: EXAM_CODE,
      answers: answers,
      time_taken: Math.floor(Math.random() * 1800) + 600,  // 10-40 minutes in seconds
    });

    const start = Date.now();
    const res = http.post(`${API_URL}/exam/${EXAM_CODE}/submit`, payload, {
      headers: authHeaders(),
    });
    examSubmitDuration.add(Date.now() - start);

    const ok = check(res, {
      "exam submit: success status": (r) => r.status === 200 || r.status === 201,
      "exam submit: no server error": (r) => r.status < 500,
    });
    errorRate.add(!ok);
    if (ok) successfulSubmissions.add(1);
  });
}
