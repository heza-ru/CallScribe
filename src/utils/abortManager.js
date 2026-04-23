// Module-level abort controller shared across all Claude API calls.
// Call abortAll() to cancel every in-flight request.
// A fresh controller is created automatically after each abort.

let controller = new AbortController();

export function getSignal() {
  return controller.signal;
}

export function abortAll() {
  controller.abort();
  controller = new AbortController();
}
