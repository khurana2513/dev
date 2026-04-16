/**
 * k6 All-Features Load Test — 1000 concurrent users
 *
 * Simulates 1000 students across all major features simultaneously:
 *   400  → Practice paper (create preview + submit score)
 *   200  → Burst mode (submit rapid scores)
 *   150  → Mental math (submit scores)
 *   150  → Exam (fetch + answer + submit)
 *   100  → Dashboard browsing (stats, leaderboard)
 *
 * Prerequisites:
 *   brew install k6
 *
 * Quick start (against production):
 *   k6 run load-tests/all-features.js \
 *      -e API_URL=https://dev-th.up.railway.app \
 *      -e JWT=YOUR_TOKEN_HERE
 *
 * How to get your JWT token:
 *   1. Open Chrome → go to your site → log in
 *   2. DevTools → Network tab → click "Fetch/XHR" filter (top of the panel)
 *   3. Reload the page
 *   4. Click any request that goes to your API (e.g. /users/me or /papers)
 *   5. Click "Headers" tab → scroll to "Request Headers"
 *   6. Copy the value after "Authorization: Bearer " — that is your JWT
 *
 * Scale options:
 *   250 users:   k6 run --env SCALE=250 load-tests/all-features.js ...
 *   500 users:   k6 run --env SCALE=500 load-tests/all-features.js ...
 *   1000 users:  k6 run --env SCALE=1000 load-tests/all-features.js ... (default)
 *
 * Warning: 1000 concurrent users is significant load. Start with SCALE=100 first
 *          to confirm your Railway instance can handle the load without crashing.
 */

import http from "k6/http";
import ws   from "k6/ws";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom metrics ───────────────────────────────────────────────────────────
const errorRate        = new Rate("error_rate");
const practiceLatency  = new Trend("practice_ms", true);
const burstLatency     = new Trend("burst_ms", true);
const mentalLatency    = new Trend("mental_ms", true);
const examLatency      = new Trend("exam_ms", true);
const examFullLatency  = new Trend("exam_full_ms", true);  // full join→questions→submit flow
const dashboardLatency = new Trend("dashboard_ms", true);
const duelLatency      = new Trend("duel_ms", true);       // WS session duration
const successCount     = new Counter("successful_submissions");

// ─── Scale multiplier ─────────────────────────────────────────────────────────
const SCALE = parseInt(__ENV.SCALE || "1000");
const practice  = Math.round(SCALE * 0.40);
const burst     = Math.round(SCALE * 0.20);
const mental    = Math.round(SCALE * 0.15);
const exam      = Math.round(SCALE * 0.15);
const dashboard = Math.round(SCALE * 0.10);
const duel      = Math.max(2, Math.round(SCALE * 0.05));   // min 2 so duel scenario always runs

// ─── Load shape ───────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Practice paper students
    practice_session: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: practice },
        { duration: "90s", target: practice },
        { duration: "20s", target: 0 },
      ],
      exec: "practicePaperUser",
    },

    // Burst mode players
    burst_mode: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: burst },
        { duration: "90s", target: burst },
        { duration: "20s", target: 0 },
      ],
      exec: "burstModeUser",
    },

    // Mental math users
    mental_math: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: mental },
        { duration: "90s", target: mental },
        { duration: "20s", target: 0 },
      ],
      exec: "mentalMathUser",
    },

    // Real exam takers — full join → questions → answer saves → submit flow
    // Requires EXAM_CODE exam to be Published (students can join when 'scheduled' or 'live').
    // Admin must start the exam (POST /exam/{code}/start) for sessions to become 'active'.
    exam_takers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: exam },     // students joining
        { duration: "60s", target: exam },     // exam in progress
        { duration: "10s", target: 0 },        // finishing up
      ],
      exec: "examRealUser",
    },

    // Duel mode players — WebSocket room create + persistent connection
    duel_players: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: duel },
        { duration: "90s", target: duel },
        { duration: "20s", target: 0 },
      ],
      exec: "duelUser",
    },

    // Dashboard browsers
    dashboard_visitors: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: dashboard },
        { duration: "90s", target: dashboard },
        { duration: "20s", target: 0 },
      ],
      exec: "dashboardUser",
    },
  },

  // ── Pass/fail thresholds ──────────────────────────────────────────────────
  thresholds: {
    // Overall
    http_req_failed:   ["rate<0.10"],       // < 10% — 4xx excluded via responseCallback; only counts 5xx + connection errors
    http_req_duration: ["p(95)<5000"],      // 95% of ALL requests under 5s

    // Per-feature
    error_rate:        ["rate<0.08"],       // business-logic failures: only 5xx on GETs + failed POST checks
    practice_ms:       ["p(95)<3000"],
    burst_ms:          ["p(95)<2000"],
    mental_ms:         ["p(95)<2000"],
    exam_ms:           ["p(99)<8000"],      // legacy exam metric (exam_takers)
    exam_full_ms:      ["p(95)<5000"],      // full exam flow: join → questions → answer saves → submit
    dashboard_ms:      ["p(95)<3000"],
    duel_ms:           ["p(95)<35000"],     // WS session ~25s of lobby + pings; p95 under 35s
  },
};

// ─── Shared config ────────────────────────────────────────────────────────────
const API_URL       = __ENV.API_URL       || "https://dev-th.up.railway.app";
const JWT           = __ENV.JWT           || "";
const EXAM_CODE     = __ENV.EXAM_CODE     || "T-1392";      // real published exam
const WS_URL        = API_URL.replace("https://", "wss://").replace("http://", "ws://");

const HEADERS = {
  "Content-Type": "application/json",
  Authorization:  `Bearer ${JWT}`,
};

// Shared params: tell k6 that 4xx responses are expected (not failures).
// Only connection failures and 5xx count towards http_req_failed.
const PARAMS = {
  headers: HEADERS,
  responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
};

// Helpers
function ok(res) {
  return res.status >= 200 && res.status < 300;
}

function randomScore(total) {
  return Math.floor(Math.random() * (total * 0.8)) + Math.floor(total * 0.2);
}

function randomTime(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Build a valid PaperConfig object for POST /papers/preview.
 * Matches backend PaperConfig schema: { level, title, totalQuestions, blocks[], orientation }
 * Each block matches BlockConfig: { id, type, count, constraints, title }
 *
 * IMPORTANT: level must be an exact PaperLevel enum value (case-sensitive):
 *   "Custom", "Junior", "AB-1" ... "AB-10", "Advanced", "Vedic-Level-1" ...
 *   "junior" / "basic" / "advanced" are NOT valid and will return 422.
 */
function buildPaperConfig(level) {
  // "Junior" = 2-digit 3-row, "AB-1" = 3-digit 4-row, "Advanced" = 4-digit 5-row
  const digitsMap  = { "Junior": 2, "AB-1": 3, "Advanced": 4 };
  const rowsMap    = { "Junior": 3, "AB-1": 4,  "Advanced": 5 };
  const digits     = digitsMap[level] || 2;
  const rows       = rowsMap[level]   || 3;
  const totalQ     = "20";

  return {
    level:          level,        // Must match PaperLevel enum exactly
    title:          "Load Test Paper",
    totalQuestions: totalQ,
    orientation:    "portrait",
    blocks: [
      {
        id:    "block_1",
        type:  "addition",
        count: 10,
        title: "Addition",
        constraints: {
          digits:      digits,
          rows:        rows,
          negatives:   false,
          allowCarry:  true,   // correct field name (not 'carry')
        },
      },
      {
        id:    "block_2",
        type:  "subtraction",
        count: 10,
        title: "Subtraction",
        constraints: {
          digits:      digits,
          rows:        rows,
          negatives:   false,
          allowCarry:  true,
        },
      },
    ],
  };
}

/**
 * Build a valid PracticeSessionCreate for POST /users/practice-session.
 * Matches schema: { operation_type, difficulty_mode, total_questions, correct_answers,
 *                   wrong_answers, accuracy, score, time_taken, points_earned, attempts[] }
 */
function buildPracticeSession(operationType, difficultyMode, totalQ, correct, timeSec) {
  const wrong    = totalQ - correct;
  const accuracy = parseFloat(((correct / totalQ) * 100).toFixed(2));
  const score    = correct * 10;

  // Build all attempts: correct ones first, then wrong ones (backend uses the list for Attempt records)
  const attempts = [];
  for (let i = 0; i < totalQ; i++) {
    const isCorrect     = i < correct;
    const correctAnswer = 42 + i;   // distinct correct answers per question
    attempts.push({
      question_data:  { text: `Q${i + 1}`, answer: correctAnswer },
      user_answer:    isCorrect ? correctAnswer : correctAnswer + 1,  // wrong = off-by-one
      correct_answer: correctAnswer,
      is_correct:     isCorrect,
      time_taken:     parseFloat((timeSec / totalQ).toFixed(2)),
      question_number: i + 1,
    });
  }

  return {
    operation_type:  operationType,
    difficulty_mode: difficultyMode,
    total_questions: totalQ,
    correct_answers: correct,
    wrong_answers:   wrong,
    accuracy:        accuracy,
    score:           score,
    time_taken:      timeSec,
    points_earned:   0,   // backend calculates actual points; 0 is safe
    attempts:        attempts,
  };
}

// ─── Scenario: Practice Paper ──────────────────────────────────────────────
export function practicePaperUser() {
  // Valid PaperLevel enum values (case-sensitive — "junior" etc. will give 422)
  const levels  = ["Junior", "AB-1", "Advanced"];
  const level   = levels[Math.floor(Math.random() * levels.length)];

  group("practice: list papers", () => {
    const res = http.get(`${API_URL}/papers`, PARAMS);
    errorRate.add(res.status >= 500);
  });

  sleep(0.5);

  let previewSeed = null;
  let previewBlocks = [];

  group("practice: generate preview", () => {
    const config  = buildPaperConfig(level);
    const payload = JSON.stringify(config);
    const start   = Date.now();
    const res     = http.post(`${API_URL}/papers/preview`, payload, PARAMS);
    practiceLatency.add(Date.now() - start);

    const passed = check(res, {
      "preview 200": (r) => r.status === 200,
      "has blocks array": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.blocks) && body.blocks.length > 0;
        } catch { return false; }
      },
    });
    errorRate.add(!passed);

    // Capture preview data for the subsequent attempt
    try {
      const body    = JSON.parse(res.body);
      previewSeed   = body.seed;
      previewBlocks = body.blocks || [];
    } catch {}
  });

  sleep(randomTime(10, 30));  // simulate user answering questions

  group("practice: submit attempt", () => {
    if (!previewSeed || previewBlocks.length === 0) {
      // No preview data — skip submit (preview failed upstream)
      return;
    }

    const totalQ  = previewBlocks.reduce((s, b) => s + (b.questions ? b.questions.length : 0), 0);
    const correct = randomScore(totalQ || 20);

    // PaperAttemptCreate schema:
    // { paper_title, paper_level, paper_config, generated_blocks, seed, answers?, time_taken? }
    const payload = JSON.stringify({
      paper_title:      `Load Test Paper`,
      paper_level:      level,
      paper_config:     buildPaperConfig(level),
      generated_blocks: previewBlocks,
      seed:             previewSeed,
      time_taken:       randomTime(30, 180),
      answers:          {},
    });
    const start = Date.now();
    const res   = http.post(`${API_URL}/papers/attempt`, payload, PARAMS);
    practiceLatency.add(Date.now() - start);

    const passed = check(res, {
      "attempt accepted": (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!passed);
    if (passed) successCount.add(1);
  });

  sleep(2);
}

// ─── Scenario: Burst Mode ─────────────────────────────────────────────────────
// Burst mode submits to POST /users/practice-session  (operation_type = "burst_mode")
export function burstModeUser() {
  group("burst: check user stats", () => {
    const res = http.get(`${API_URL}/users/stats`, PARAMS);
    errorRate.add(res.status >= 500);
  });

  sleep(randomTime(5, 20));  // simulate burst session

  group("burst: submit score", () => {
    const totalQ   = 30;
    const correct  = randomScore(totalQ);
    const timeSec  = randomTime(20, 90);
    const payload  = JSON.stringify(
      buildPracticeSession("burst_mode", "custom", totalQ, correct, timeSec)
    );
    const start = Date.now();
    const res   = http.post(`${API_URL}/users/practice-session`, payload, PARAMS);
    burstLatency.add(Date.now() - start);

    const passed = check(res, {
      "burst submit ok": (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!passed);
    if (passed) successCount.add(1);
  });

  sleep(2);
}

// ─── Scenario: Mental Math ────────────────────────────────────────────────────
// Mental math submits to POST /users/practice-session  (operation_type = "mental_math")
export function mentalMathUser() {
  group("mental: attempt count", () => {
    const res = http.get(`${API_URL}/papers/attempt/count`, PARAMS);
    errorRate.add(res.status >= 500);
  });

  sleep(randomTime(10, 25));  // simulate mental math drill

  group("mental: submit score", () => {
    const totalQ   = 15;
    const correct  = randomScore(totalQ);
    const timeSec  = randomTime(15, 60);
    const payload  = JSON.stringify(
      buildPracticeSession("mental_math", "standard", totalQ, correct, timeSec)
    );
    const start = Date.now();
    const res   = http.post(`${API_URL}/users/practice-session`, payload, PARAMS);
    mentalLatency.add(Date.now() - start);

    const passed = check(res, {
      "mental submit ok": (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!passed);
    if (passed) successCount.add(1);
  });

  sleep(2);
}

// ─── Scenario: Real Exam (T-1392) ────────────────────────────────────────────
// Full student exam flow: fetch metadata → join → get questions → save answers → submit.
// PREREQUISITE: Admin must have Published the exam (EXAM_CODE must be published).
//               Start the exam via admin UI before running at full scale so sessions
//               are created as 'active'; otherwise students join as 'waiting'.
export function examRealUser() {
  // Stagger joins so not everyone hits the DB simultaneously
  sleep(Math.random() * 5);

  // ── 1. Fetch exam metadata (verify it exists + is published) ───────────────
  const infoRes = http.get(`${API_URL}/exam/${EXAM_CODE}`, PARAMS);
  if (infoRes.status !== 200) {
    errorRate.add(infoRes.status >= 500);
    return;
  }

  // ── 2. Join the exam ───────────────────────────────────────────────────────
  const joinStart = Date.now();
  const joinRes = http.post(
    `${API_URL}/exam/${EXAM_CODE}/join`,
    JSON.stringify({ exam_code: EXAM_CODE, device_fingerprint: `k6-vu-${__VU}` }),
    PARAMS,
  );
  examFullLatency.add(Date.now() - joinStart);

  const joinOk = check(joinRes, {
    "exam join ok": (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(joinRes.status >= 500);
  if (!joinOk) return;

  let sessionId  = 0;
  let examStatus = "waiting";
  try {
    const body = JSON.parse(joinRes.body);
    sessionId  = body.session_id;
    examStatus = body.status;
  } catch { return; }

  // ── 3. Fetch questions (requires exam to be 'live'/session 'active') ───────
  let questions = [];
  if (examStatus === "active") {
    const qRes = http.get(
      `${API_URL}/exam/${EXAM_CODE}/questions?session_id=${sessionId}`,
      PARAMS,
    );
    examFullLatency.add(Date.now() - joinStart); // cumulative
    try {
      questions = JSON.parse(qRes.body).questions || [];
    } catch {}
  }

  // ── 4. Simulate student answering (save answers periodically) ─────────────
  sleep(randomTime(8, 20));  // student reading + answering

  if (examStatus === "active" && questions.length > 0) {
    // Save up to 5 answers (realistic: student saves as they go)
    const saveCount = Math.min(5, questions.length);
    for (let i = 0; i < saveCount; i++) {
      const saveRes = http.post(
        `${API_URL}/exam/${EXAM_CODE}/answer`,
        JSON.stringify({
          question_id: questions[i].id,
          raw_answer:  String(Math.floor(Math.random() * 200) + 1),
        }),
        PARAMS,
      );
      errorRate.add(saveRes.status >= 500);
      sleep(0.3);
    }
  }

  // ── 5. Submit ──────────────────────────────────────────────────────────────
  if (examStatus === "active") {
    const submitAnswers = questions.map((q) => ({
      question_id: q.id,
      raw_answer:  String(Math.floor(Math.random() * 200) + 1),
    }));

    const submitStart = Date.now();
    const submitRes = http.post(
      `${API_URL}/exam/${EXAM_CODE}/submit`,
      JSON.stringify({ answers: submitAnswers }),
      PARAMS,
    );
    examFullLatency.add(Date.now() - submitStart);
    examLatency.add(Date.now() - submitStart); // keep legacy metric populated

    check(submitRes, {
      "exam submit: no 5xx":      (r) => r.status < 500,
      "exam submit: not timeout": (r) => r.status !== 0,
    });
    errorRate.add(submitRes.status >= 500);
    if (submitRes.status === 200) successCount.add(1);
  }

  sleep(2);
}

// ─── Scenario: Dashboard Browser ──────────────────────────────────────────────
export function dashboardUser() {
  group("dashboard: user profile", () => {
    const start = Date.now();
    const res   = http.get(`${API_URL}/users/me`, PARAMS);
    dashboardLatency.add(Date.now() - start);
    errorRate.add(res.status >= 500);
  });

  sleep(1);

  group("dashboard: user stats", () => {
    const start = Date.now();
    const res   = http.get(`${API_URL}/users/stats`, PARAMS);
    dashboardLatency.add(Date.now() - start);
    errorRate.add(res.status >= 500);
  });

  sleep(1);

  group("dashboard: attempt history", () => {
    const res = http.get(`${API_URL}/papers/attempts`, PARAMS);
    errorRate.add(res.status >= 500);
  });

  sleep(1);

  group("dashboard: point rules", () => {
    const res = http.get(`${API_URL}/api/point-rules`, { responseCallback: http.expectedStatuses({ min: 200, max: 499 }) });
    errorRate.add(res.status >= 500);
  });

  sleep(randomTime(5, 15));  // browsing think time
}

// ─── Scenario: Duel Mode (WebSocket) ─────────────────────────────────────────
// Simulates a student creating a duel room and holding a WebSocket connection
// (the typical lobby + in-game presence).  Tests:
//   • room creation throughput (POST /duel/rooms)
//   • WS auth ticket issuance  (POST /duel/rooms/{code}/ws-ticket)
//   • concurrent WS connections (N VUs × ~25 s each)
//   • keepalive message relay   (PING → PONG) + SCORE_UPDATE routing
//
// NOTE: Rooms are created 1-per-VU so no cross-VU coordination is needed.
//       START requires ≥2 players; without a partner the room stays in 'lobby'
//       and SCORE_UPDATE messages are silently dropped by the server — this is
//       intentional: we're load-testing the infrastructure, not game mechanics.
export function duelUser() {
  // ── 1. Create a room ────────────────────────────────────────────────────────
  const createRes = http.post(
    `${API_URL}/duel/rooms`,
    JSON.stringify({
      config: { type: "single", opType: "addition", optionValue: "2digit" },
    }),
    PARAMS,
  );

  if (createRes.status !== 200 && createRes.status !== 201) {
    errorRate.add(createRes.status >= 500);
    return;
  }

  let code = "";
  try { code = JSON.parse(createRes.body).code; } catch { return; }

  // ── 2. Get a one-time WS auth ticket ────────────────────────────────────────
  const ticketRes = http.post(
    `${API_URL}/duel/rooms/${code}/ws-ticket`,
    null,
    PARAMS,
  );
  if (ticketRes.status !== 200) {
    errorRate.add(ticketRes.status >= 500);
    return;
  }

  let ticket = "";
  try { ticket = JSON.parse(ticketRes.body).ticket; } catch { return; }

  // ── 3. Open WebSocket and simulate lobby presence ────────────────────────────
  const wsStart = Date.now();
  const wsRes = ws.connect(
    `${WS_URL}/duel/ws/${code}?ticket=${ticket}`,
    {},
    function (socket) {
      let ticks = 0;

      socket.on("open", function () {
        // Send PING every 5 s — realistic client keepalive
        socket.setInterval(function () {
          ticks++;
          socket.send(JSON.stringify({ type: "PING", payload: {} }));

          // At tick 2: send a SCORE_UPDATE (exercises WS message routing;
          // server ignores it because state is still 'lobby')
          if (ticks === 2) {
            socket.send(JSON.stringify({
              type: "SCORE_UPDATE",
              payload: { correct: 5, wrong: 1, points: 50 },
            }));
          }

          // Close after 5 pings (~25 s) — simulates game session length
          if (ticks >= 5) {
            socket.close();
          }
        }, 5000);
      });

      socket.on("message", function () { /* consume; no action needed */ });
      socket.on("error",   function () { errorRate.add(true); });
    },
  );

  duelLatency.add(Date.now() - wsStart);

  check(wsRes, {
    "duel ws connected": (r) => r && r.status === 101,
  });

  sleep(1);
}
