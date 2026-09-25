# Frontend adoption evidence

The frontend replacement is still a candidate. Its first comparison failed
preservation checks and cannot authorize retirement of the existing contributor
skills.

The original protocol and snapshots remain under
`tests/fixtures/frontend-adoption/`. An initial infrastructure failure and its
explicit sampling amendment are preserved. The amended comparison was stopped
after ten of 66 scheduled rows: nine completed, and the last was interrupted.
Complete raw outputs, events, product files, browser observations and screenshots
are in `closed-comparison/`, with an archive manifest. Unattempted rows are not
passes.

Independent review of the first three outputs found explicit brand substitutions
and unintended use of installed Handoff guidance. The baseline used Arial where
Georgia was specified; two candidate outputs used 6px control radii where 12px was
specified. The baseline font finding is an append-only correction to the original
review. All three effective preservation decisions fail. Review independence is
preserved, but blinding was incomplete: one tool result exposed a skill body.
See `independent-review/batch-01.json` and
`independent-review/batch-01-brand-font-correction.json` in the original fixture.

A separate diagnostic moved the unchanged F02 candidate guidance from top-level
user text to a local file. The model read that file, completed the audit, preserved
all input bytes and did not read another public skill. Both earlier F02 candidate
captures had read Handoff. This suggests sensitivity to how guidance is supplied;
one diagnostic does not isolate a deterministic host trigger from model behavior
or sampling variability. It is not a passing adoption trial.

The revised candidate makes explicit brand-token application and rendered checks
clearer, including form controls. A separate matched protocol will supply both
variants' guidance through files and retain the same requested outcomes, facts,
rubric and image budgets. Prompt-only tasks may read their guidance but may not
generate images, execute product work or edit files. Earlier failed evidence will
remain unchanged. Adoption requires the revised preservation and quality results;
source length and successful capture exits alone are insufficient.

## Revised comparison readiness and approval

The separate [file-guidance comparison](../../tests/fixtures/frontend-adoption-v2/README.md) is frozen at plan SHA256 `50008084056b8446c04730ecafa627a601fec07666b00af6104f423a813099f7`. Parent review found the native image-generation `savedPath` output field needed explicit collection; the corrected collector and actual-raster negative controls passed in the ten-test preparation suite. Prior frozen preparation was preserved before amendment. Neither prior failures nor model results were overwritten.

Automatic approval review rejected the first launch before process creation, describing repository guidance and copied non-command reference bodies as a sensitive payload sent to an unverified model service. The user was asked specifically to authorize these 66 trials through the existing Codex service with skill text and synthetic museum fixtures. That decision is pending; zero revised frontend model trials have started. The approval block is distinct from the earlier runtime and behavioral failures.
