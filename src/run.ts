import { InfraiClient } from "./infrai_client.ts";
import { appointmentSchema, notificationDecision, publishSendingDomain } from "./appointment_notifications.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the migration.");
const appointment = appointmentSchema.parse({ patientReference: "appt-2048", appointmentDate: "2026-11-03T09:30:00Z", recipient: "patient@example.com", sendingDomain: "notify.example.com" });
if (notificationDecision(appointment) === "hold") throw new Error("Appointment notification is missing required scheduling data.");
const result = await publishSendingDomain(new InfraiClient(key), appointment.sendingDomain);
console.log(JSON.stringify({ appointment: appointment.patientReference, action: "send", ...result }, null, 2));
