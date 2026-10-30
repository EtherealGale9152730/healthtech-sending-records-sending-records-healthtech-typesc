import assert from "node:assert/strict";
import { appointmentSchema, notificationDecision } from "./appointment_notifications.ts";

const valid = appointmentSchema.parse({ patientReference: "appt-7", appointmentDate: "2026-11-03", recipient: "patient@example.com", sendingDomain: "notify.example.com" });
assert.equal(notificationDecision(valid), "send");
assert.throws(() => appointmentSchema.parse({ patientReference: "", appointmentDate: "2026-11-03", recipient: "patient@example.com", sendingDomain: "notify.example.com" }));
console.log("appointment notification decision: send for a complete appointment; invalid reference rejected");
