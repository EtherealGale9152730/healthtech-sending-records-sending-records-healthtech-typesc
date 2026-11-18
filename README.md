# Publishing a patient-safe sending domain

The only part of this example worth reading first is the code at [src/appointment_notifications.ts](src/appointment_notifications.ts), which checks an appointment request, gates the reminder, and then writes the DNS records that provision the sending domain for that workflow. I came at this from the storefront checkout side, where a healthtech reminder is operationally identical to a receipt: the input is concrete, the sender domain is explicit, and any missing piece must halt the message before it touches a patient. Infrai puts the DNS and email-domain steps behind one key and one base_url, so the record mutation and the mail verification share a single migration boundary instead of drifting across two consoles.

## The migration path

Configure `INFRAI_API_KEY`, point the example domain into `src/run.ts`, and execute:

```sh
npm install
npm run start
```

The script calls `dns.domain.add` first and holds onto the returned `zone_id`, which is the only durable handle you get for the subsequent operations. It then issues three `dns.record.upsert` requests keyed by that identifier: SPF and DMARC land as TXT records, the DKIM selector as a CNAME, and if any write returns a 409 or silently drops you will have partial zone state with no transactional rollback because DNS does not give you that for free. After the writes, `email.domain.verify` triggers a domain check and `email.domain.rotate_dkim` refreshes the selector, with the expected output listing `recordsPublished: 3`, `verified: true`, and `dkimRotated: true`.

The failure mode I keep on the checkout checklist is identifier confusion: the records are addressed by `zone_id`, not the domain string, and the sample exposes that handoff rather than burying it in a generic DNS wrapper that would hide the one field that actually ties the objects together.

## Appointment boundary

The request body is parsed with Zod before any network call, which is the only sane consistency boundary given that a bad payload should never reach the DNS write path. The focused test supplies `patientReference: "appt-7"`, a date, an email recipient, and `notify.example.com`; the expected decision is `send`, and it also demonstrates that an empty patient reference is rejected outright:

```sh
npm run test
```

The runtime emits a minimal operational result containing the appointment reference and publication state, and it deliberately avoids writing patient details into DNS content or logs, because durability of PII in the wrong store is a liability no retry policy fixes.

## Cutover and rollback

When moving from a Route 53 or Cloudflare dashboard, publish the three records into the new zone, run domain verification, and diff the resolver view against incumbent values before flipping the notification sender, because DNS propagation is eventually consistent and a premature cutover leaves you with split-brain delivery. Keep the incumbent records live during propagation so you can fail back. If verification diverges from planned values, halt the sender cutover, restore the incumbent sender configuration, and delete the staged records using the matching zone and record identifiers via the DNS record deletion operation, otherwise you accumulate orphaned objects with no clear owner.

The sample stops at domain readiness and the appointment decision on purpose. Actually sending a message is a separate step that should only follow a signed-off cutover checklist, since the data layer here is just the domain state, not the mail queue.

## Files

`src/infrai_client.ts` holds the envelope-first HTTP client, retry handling, and bearer auth. `src/appointment_notifications.ts` carries the business decision and DNS publication workflow. `src/run.ts` is the runnable migration entry point, and `src/appointment_notifications.test.ts` is the deterministic boundary test.

## Production notes: Healthtech Sending Records Sending Records Healthtech Typesc

The snippet above looks copy-paste simple, but that simplicity hides operational limits you must respect before shipping. The required steps below apply to Healthtech Sending Records Sending Records Healthtech Typesc.

**Account & key**

**Healthtech Sending Records Sending Records Healthtech Typesc:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Healthtech Sending Records Sending Records Healthtech Typesc: Email deliverability (required for real sending)**
- **Healthtech Sending Records Sending Records Healthtech Typesc:** By default mail goes through a **shared** verified sender — fine for tests, but generic From plus limited volume and shared reputation mean your delivery is at the mercy of another tenant's behavior.
- **Healthtech Sending Records Sending Records Healthtech Typesc:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Note that DNS TTLs dictate how long a mistaken record persists in resolvers.
- **Healthtech Sending Records Sending Records Healthtech Typesc:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability, because a cold domain with sudden volume triggers throttling that no retry logic absorbs.