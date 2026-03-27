/**
 * In-process circuit breaker for Chatwoot API calls.
 *
 * States:
 *   CLOSED    — normal operation, tracking consecutive failures
 *   OPEN      — Chatwoot unreachable, fast-fail for COOLDOWN_MS
 *   HALF_OPEN — cooldown expired, allows one probe request
 *
 * State is per chatwootAccountId and lives in module-level memory,
 * so it is shared within a single process (worker or app server).
 */

const FAILURE_THRESHOLD = 5;          // consecutive failures to trip
const COOLDOWN_MS = 5 * 60 * 1000;   // 5 min open before half-open probe

type CircuitStatus = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitState {
  status: CircuitStatus;
  consecutiveFailures: number;
  openUntil: number | null; // epoch ms
}

const circuits = new Map<string, CircuitState>();

function getState(accountId: string): CircuitState {
  if (!circuits.has(accountId)) {
    circuits.set(accountId, { status: "CLOSED", consecutiveFailures: 0, openUntil: null });
  }
  return circuits.get(accountId)!;
}

/** Returns true when the circuit is OPEN (request should be rejected fast). */
export function isCircuitOpen(accountId: string): boolean {
  const state = getState(accountId);

  if (state.status === "CLOSED") return false;

  if (state.status === "OPEN") {
    if (Date.now() >= state.openUntil!) {
      // Cooldown expired → half-open: let one probe through
      state.status = "HALF_OPEN";
      console.log(`[CircuitBreaker] account=${accountId} → HALF_OPEN (probe allowed)`);
      return false;
    }
    return true;
  }

  // HALF_OPEN: let the single probe through
  return false;
}

/** Call on every successful Chatwoot response. */
export function recordSuccess(accountId: string): void {
  const state = getState(accountId);
  if (state.status !== "CLOSED") {
    console.log(`[CircuitBreaker] account=${accountId} → CLOSED (success)`);
  }
  state.status = "CLOSED";
  state.consecutiveFailures = 0;
  state.openUntil = null;
}

/** Call on every failed Chatwoot response. */
export function recordFailure(accountId: string): void {
  const state = getState(accountId);

  if (state.status === "HALF_OPEN") {
    // Probe failed — reopen immediately
    state.status = "OPEN";
    state.openUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[CircuitBreaker] account=${accountId} probe failed → OPEN again until ${new Date(state.openUntil).toISOString()}`
    );
    return;
  }

  state.consecutiveFailures++;

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.status = "OPEN";
    state.openUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[CircuitBreaker] account=${accountId} tripped after ${state.consecutiveFailures} failures → OPEN until ${new Date(state.openUntil).toISOString()}`
    );
  }
}

/** How long (ms) until circuit closes again. 0 if already closed. */
export function cooldownRemainingMs(accountId: string): number {
  const state = getState(accountId);
  if (state.status !== "OPEN" || !state.openUntil) return 0;
  return Math.max(0, state.openUntil - Date.now());
}
