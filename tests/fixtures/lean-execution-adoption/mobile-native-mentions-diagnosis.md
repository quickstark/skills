LEX-12-MOBILE-REPORT-ROUTE — native explicit mention investigation

Native version observed: codex-cli 0.162.1. Exact official tag rust-v0.162.1 resolves to 7a078f6bb4ce0dc2a81408b334ce52979d92c603.

Observed local evidence:
- scripts/frontend-native-capture.mjs:188 starts an ephemeral native thread without disabling user-installed skills; :195-197 submits the whole frozen prompt as one text item with text_elements: []. It supplies no structured skill selection.
- mobile-report-followup-captures/MR1, MR2, MR3/raw-protocol.jsonl:14 each has direction='sent', message.method='turn/start', and a single text input. The submitted text contains $qs-skills:qs-flow-handoff once and $qs-frontend:qs-design-image-mobile zero times. Raw-protocol :33-34 echoes the user message. No distinct tool item or native skill-injection notification appears in these captures; lack of such notification does not prove no injection.
- Canonical mobile completion identifies /qs-design-image-mobile (skills/engineering/qs-design-image-mobile/SKILL.md:43,59) and embeds the handoff literal (:67). Handoff completion instead identifies /qs-flow-handoff (skills/productivity/qs-flow-handoff/SKILL.md:32,48) and allows qs-plan-clarify (:41,56), matching the wrong output signature.
- Generated local 0.162.1 schema /tmp/lex-mobile-native-schema/v2/TurnStartParams.json:698-720 supports a structured skill input, but structure is not required by the native text-selection source.

Exact-version official source, fetched through GitHub MCP and retained locally:
1. https://github.com/openai/codex/blob/7a078f6bb4ce0dc2a81408b334ce52979d92c603/codex-rs/skills/src/selection.rs#L98-L108
   Every UserInput::Text is scanned using extract_tool_mentions(text); text_elements and quoted instruction boundaries are ignored. :166-198 selects enabled, unambiguous plain-name matches. Local copy /tmp/lex-mobile-native-selection.rs.
2. https://github.com/openai/codex/blob/7a078f6bb4ce0dc2a81408b334ce52979d92c603/codex-rs/skills/src/mentions.rs#L88-L148
   Raw-byte scanner extracts dollar-prefixed names without code, XML, or quoting exclusions. :226-227 explicitly accepts colon, preserving qs-skills:qs-flow-handoff intact. Backslash escaping a dollar would not evade this parser. Local copy /tmp/lex-mobile-native-mentions.rs.
3. https://github.com/openai/codex/blob/7a078f6bb4ce0dc2a81408b334ce52979d92c603/codex-rs/core/src/session/turn.rs#L1081-L1099
   Calls collect_explicit_skill_mentions and load_skill_prompts. :1112-1115 builds contextual user fragments; :396-403 records injection items. A separate guardian-only exclusion at :1038-1042 does not describe ordinary app-server turns. Local copy /tmp/lex-mobile-native-turn.rs.
4. Official OpenAI documentation https://learn.chatgpt.com/docs/build-skills#how-chatgpt-and-codex-use-skills confirms dollar mentions explicitly activate skills; it does not describe quoted-text exclusions.

Synthesis:
The native host has an automatic text-mention selection path capable of injecting the installed handoff body from a literal embedded only as frozen completion-format data. This is a concrete harness-contamination mechanism, not merely speculative model confusion. Actual successful lookup/injection in these three runs remains an inference: their assembled model context and skill prompt bytes are not exposed in captured protocol. The matching handoff root/clarify route signature and repeated failures strengthen that inference. Native code does not itself change a formal root field; injected instructions can change what the model follows and reports.

Smallest justified next step is a controlled harness-boundary probe/guard, preserving original B8 and all frozen trials. No canonical mobile policy weakening or root/route catalog change is supported. Retire the earlier unqualified conclusion that source adherence alone explains B8; it omitted turn-time native prompt expansion.

Additional reads explained:
Read local CLI help/version and generated schema (no inference run), then official OpenAI documentation and exact-version official source to distinguish structured mentions from raw-text activation. Read handoff ending because its root and continuation signature discriminate the injection hypothesis. No model trials, settings changes, installs, repository edits, or public-skill execution occurred. Only /tmp notes/schema/source copies were written.

All package/source acceptance remains pending; closure outcomes unknown; efficiency inconclusive.
