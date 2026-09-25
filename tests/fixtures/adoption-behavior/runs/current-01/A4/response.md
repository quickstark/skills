- [ ] Active: Explain the API rename and when integration must wait for consumers (weight: 100%).

Stage: Explain migration | Stage estimate: ~0% | Overall estimate: ~0% | active — Using the supplied teaching guidance for a chat-only explanation. Input needed: none.

**Expand/migrate/contract lets an API change while consumers move at different speeds.** A consumer is any application or job that calls the API.

Suppose you rename `GET /v1/users/{id}` to `GET /v1/members/{id}`, keeping the response and behavior identical.

| Phase | Concrete change | Completion condition |
|---|---|---|
| **Expand** | Add `/members/{id}` while keeping `/users/{id}`. Both use the same implementation. | Both routes work with equivalent authorization, responses, and errors. |
| **Migrate** | Update the website, background jobs, and mobile clients to call `/members/{id}`. | Affected supported consumers have moved, with deployment and usage evidence. |
| **Contract** | Remove `/users/{id}` and its compatibility code. | No supported consumer still needs the old route, including versions that might return through rollback. |

Deploy the expanded provider before switching consumers. Keep both routes available throughout migration so each consumer can move independently.

**An integration task must wait when its acceptance criteria depend on consumers that have not migrated.** For example, “remove the old route and verify the complete system” remains blocked while a supported mobile version still calls `/users/{id}`. A merged consumer change alone is insufficient: it must reach the relevant running clients.

Adding the compatible new route can finish earlier. Updating the website can also finish while mobile migration continues, provided both routes remain available. Report those bounded tasks as complete while keeping the overall migration open.

Before contraction, useful evidence includes consumer compatibility checks, deployed versions, and old-route usage over a representative period. Quiet traffic alone can miss a monthly job or an offline mobile client. If supported consumers cannot move yet, retain compatibility or wait for their support period to end.

**Practice:** The website uses `/members/{id}`, but a supported monthly billing job still uses `/users/{id}`. Can you remove the old route?

**Answer:** No. The website migration can be complete; contraction must wait for the billing job.

- [x] Verified: Explanation covers all three phases, deployment order, consumer dependencies, and a worked check.

Stage: Explain migration | Stage estimate: ~100% | Overall estimate: ~100% | complete — Teaching scope checked against the request; learner understanding remains unassessed. Input needed: none.

Status: Complete  
Skills used: /qs-learn-teach (supplied guidance only; no public skill invoked).  
Outcome: Chat-only explanation delivered. Nothing configured or changed; no execution checks run.  
Next work prompt: None — no follow-on needed.