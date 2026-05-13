import assert from "node:assert/strict";
import test from "node:test";
import { AuthService } from "./auth.js";

test("pairing exchanges console code for bearer token", () => {
  const auth = new AuthService(60_000, 60_000);
  const pairing = auth.getPairingState();
  const result = auth.pair(pairing.code);
  assert.ok(result.token);
  assert.equal(auth.verifyBearer(`Bearer ${result.token}`), true);
});

test("invalid and expired tokens are rejected", async () => {
  const auth = new AuthService(1, 60_000);
  assert.equal(auth.verifyBearer("Bearer invalid"), false);
  const result = auth.pair(auth.getPairingState().code);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(auth.verifyBearer(`Bearer ${result.token}`), false);
});

test("revokeAll invalidates existing phone sessions", () => {
  const auth = new AuthService(60_000, 60_000);
  const result = auth.pair(auth.getPairingState().code);
  assert.equal(auth.verifyBearer(`Bearer ${result.token}`), true);
  auth.revokeAll();
  assert.equal(auth.verifyBearer(`Bearer ${result.token}`), false);
});
