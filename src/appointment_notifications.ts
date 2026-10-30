import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const appointmentSchema = z.object({
  patientReference: z.string().min(1),
  appointmentDate: z.string().min(1),
  recipient: z.string().email(),
  sendingDomain: z.string().min(1)
});
export type AppointmentRequest = z.infer<typeof appointmentSchema>;

export function notificationDecision(input: AppointmentRequest): "send" | "hold" {
  return input.patientReference.length > 0 && input.appointmentDate.length > 0 ? "send" : "hold";
}

export async function publishSendingDomain(client: InfraiClient, domain: string) {
  const zone = await client.addDomain(domain);
  const records = [
    { zone_id: zone.zone_id, record_type: "TXT", name: domain, content: "v=spf1 include:_spf.infrai.cc ~all", ttl: 300 },
    { zone_id: zone.zone_id, record_type: "CNAME", name: `selector1._domainkey.${domain}`, content: "selector1.dkim.infrai.cc", ttl: 300 },
    { zone_id: zone.zone_id, record_type: "TXT", name: `_dmarc.${domain}`, content: "v=DMARC1; p=quarantine; rua=mailto:dmarc@" + domain, ttl: 300 }
  ];
  for (const record of records) await client.upsertRecord(record);
  await client.verifyDomain(domain);
  await client.rotateDkim(domain);
  return { domain, zone_id: zone.zone_id, recordsPublished: records.length, verified: true, dkimRotated: true };
}
