import assert from "node:assert/strict";
import { classifyReminderResult } from "@/lib/tutor-recovery-send";
import { runAdminAction, AdminActionError } from "@/lib/admin-actions";

async function main() {
  assert.equal(classifyReminderResult(true, { sent: false }), "alreadyReceived");
  assert.equal(classifyReminderResult(false, { sent: true }), "sent");
  assert.equal(
    classifyReminderResult(false, { sent: false, reason: "already_sent" }),
    "alreadyReceived",
  );
  assert.equal(
    classifyReminderResult(false, { sent: false, reason: "ineligible" }),
    "becameIneligible",
  );
  assert.equal(
    classifyReminderResult(false, { sent: false, reason: "complete" }),
    "becameIneligible",
  );
  assert.equal(
    classifyReminderResult(false, { sent: false, reason: "not_started" }),
    "becameIneligible",
  );
  assert.equal(classifyReminderResult(false, { sent: false, reason: "unknown" }), "failed");

  let threw = false;
  try {
    await runAdminAction("admin_test", { action: "send_recovery_email_1" });
  } catch (err) {
    threw = true;
    assert.ok(err instanceof AdminActionError);
    assert.match(String(err.message), /confirmSend/i);
  }
  assert.equal(threw, true);

  console.log("tutor-recovery-send.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
