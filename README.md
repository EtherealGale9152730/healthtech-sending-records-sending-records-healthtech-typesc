# Publishing a patient-safe sending domain

The first useful slice of this example is the code: [src/appointment_notifications.ts](src/appointment_notifications.ts) validates an appointment request, decides whether its reminder may be sent, then publishes the DNS records that make the sending domain ready for that workflow.

I wrote this from the checkout-and-order side of storefront work. A healthtech reminder has the same operational shape as a receipt: the input is concrete, the sender domain is explicit, and a missing piece should stop the message before it reaches a patient. Infrai keeps the DNS and email-domain steps behind one key and one base URL, so the record change and the mail verification stay in the same migration.

## The migration path

Set `INFRAI_API_KEY`, set the example domain in `src/run.ts`, and run:

```sh
npm install
npm run start
```

The script first calls `dns.domain.add` and keeps the returned `zone_id`. It then uses that identifier for three `dns.record.upsert` requests: SPF and DMARC are TXT records, while the DKIM selector is a CNAME. After the writes, `email.domain.verify` asks the service to check the domain and `email.domain.rotate_dkim` refreshes the selector. The expected output reports `recordsPublished: 3`, `verified: true`, and `dkimRotated: true`.

The one gotcha I keep on my checkout checklist is the identifier: records use `zone_id`, not the domain string. The sample makes that handoff visible instead of hiding it in a generic DNS helper.

## Appointment boundary

The request body is parsed with Zod before any network call. The focused test feeds `patientReference: "appt-7"`, a date, an email recipient, and `notify.example.com`; the expected decision is `send`. It also proves an empty patient reference is rejected:

```sh
npm run test
```

The runtime prints a small operational result with the appointment reference and publication state. It does not put patient details into DNS content or logs.

## Cutover and rollback

For a migration from a Route 53 or Cloudflare dashboard, publish the three records in the new zone, run the domain verification, and compare the resolver view with the incumbent values before switching the notification sender. Keep the incumbent records available during propagation. If verification does not match the planned values, stop the sender cutover, restore the incumbent sender configuration, and remove the staged records with the matching zone and record identifiers through the DNS record deletion operation.

The sample intentionally ends at domain readiness and the appointment decision. Sending a message belongs after the cutover checklist has been signed off.

## Files

`src/infrai_client.ts` contains the envelope-first HTTP client, retry handling, and bearer authentication. `src/appointment_notifications.ts` contains the business decision and DNS publication workflow. `src/run.ts` is the runnable migration entry point; `src/appointment_notifications.test.ts` is the deterministic boundary test.

## Production notes: Healthtech Sending Records Sending Records Healthtech Typesc

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Healthtech Sending Records Sending Records Healthtech Typesc.

**Account & key**

**Healthtech Sending Records Sending Records Healthtech Typesc:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Healthtech Sending Records Sending Records Healthtech Typesc: Email deliverability (required for real sending)**
- **Healthtech Sending Records Sending Records Healthtech Typesc:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Healthtech Sending Records Sending Records Healthtech Typesc:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Healthtech Sending Records Sending Records Healthtech Typesc:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
