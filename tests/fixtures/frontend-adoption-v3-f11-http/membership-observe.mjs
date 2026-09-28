import { join } from 'node:path';

// Page evaluation below reads DOM/state only. Opening, typing, submission and Escape
// all use native keyboard events; this observer never calls showModal/requestSubmit.
async function state(page) {
  return page.evaluate(() => {
    const email = document.querySelector('#member-email');
    const form = email?.form;
    const dialog = email?.closest('dialog');
    const visible = e => !!e && !!e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
    const active = document.activeElement;
    const style = active ? getComputedStyle(active) : null;
    const submits = form ? [...form.elements].filter(e => (e.tagName === 'BUTTON' && e.type === 'submit') || (e.tagName === 'INPUT' && ['submit', 'image'].includes(e.type))) : [];
    const openers = [...document.querySelectorAll('#join-button, [aria-haspopup="dialog"]')].filter(e => visible(e) && e !== email && !form?.contains(e));
    return {
      email: email ? { visible: visible(email), disabled: email.disabled, readOnly: email.readOnly, valid: email.validity.valid, validationMessage: email.validationMessage, value: email.value } : null,
      form: form ? { id: form.id, action: form.getAttribute('action'), method: form.method } : null,
      dialog: dialog ? { id: dialog.id, open: dialog.open, modal: dialog.matches(':modal') } : null,
      openerCandidates: openers.map(e => ({ id: e.id, tag: e.tagName, text: e.textContent, disabled: !!e.disabled, tabIndex: e.tabIndex })),
      submitControls: submits.map(e => ({ id: e.id, tag: e.tagName, text: e.textContent || e.value, visible: visible(e), disabled: !!e.disabled })),
      focus: { id: active?.id ?? null, tag: active?.tagName ?? null, text: active?.textContent?.slice(0, 120) ?? null, onEmail: active === email, onOpener: openers.includes(active), onSubmit: submits.includes(active) && visible(active) && !active.disabled, insideDialog: !!dialog?.contains(active), outlineStyle: style?.outlineStyle, outlineWidth: style?.outlineWidth, boxShadow: style?.boxShadow, documentHasFocus: document.hasFocus() },
      events: window.__events ?? null,
      message: document.querySelector('#form-message')?.textContent ?? null,
      url: location.href
    };
  });
}
async function reach(page, predicate) {
  const sequence = [];
  for (let n = 0; n <= 48; n++) {
    const observed = await state(page);
    sequence.push(observed.focus);
    if (predicate(observed)) return { reached: true, sequence, state: observed };
    if (n < 48) await page.keyboard.press('Tab');
  }
  return { reached: false, sequence, state: await state(page) };
}
async function selectAll(page) {
  await page.keyboard.down('Control');
  try { await page.keyboard.press('A'); } finally { await page.keyboard.up('Control'); }
}
async function settle(page) { await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))); }

export async function observeMembership(page, { output, name }) {
  const report = { status: 'unverified', steps: {}, qualityJudgment: 'No quality grade assigned; observed behavior only.' };
  const stop = reason => { report.status = 'failed'; report.reason = reason; return report; };
  try {
    report.initial = await state(page);
    if (!report.initial.email || !report.initial.form) return stop('Membership email/form missing.');
    const dialogForm = !!report.initial.dialog;
    report.kind = dialogForm ? 'dialog' : 'inline';
    if (!report.initial.email.visible) {
      if (!dialogForm || report.initial.dialog.open) return stop('Email is hidden without a closed native dialog.');
      if (report.initial.openerCandidates.length !== 1) return stop('No unique visible membership-dialog opener.');
      report.steps.opener = await reach(page, s => s.focus.onOpener);
      if (!report.steps.opener.reached) return stop('Visible dialog opener is not keyboard reachable.');
      report.openerFocus = report.steps.opener.state.focus;
      await page.keyboard.press('Enter'); await settle(page);
      report.opened = await state(page);
      if (!report.opened.dialog?.open || !report.opened.email?.visible) return stop('Keyboard activation did not expose membership dialog/form.');
    } else report.opened = report.initial;
    if (dialogForm) {
      report.dialogFocusSequence = [];
      for (let n = 0; n < 16; n++) { await page.keyboard.press('Tab'); report.dialogFocusSequence.push((await state(page)).focus); }
      report.focusStayedInDialog = report.dialogFocusSequence.every(s => s.insideDialog);
      report.focusReachedOutsideControl = report.dialogFocusSequence.some(s => !s.insideDialog && !['BODY', 'HTML'].includes(s.tag));
      report.focusObservationLimit = 'Sixteen Tab presses; native browser chrome may expose BODY as activeElement. A BODY sample alone is not proof of an escaped modal focus trap.';
      await page.screenshot({ path: join(output, `${name}-dialog.png`), fullPage: true });
      await page.keyboard.press('Escape'); await settle(page);
      report.afterEscape = await state(page);
      report.escapeClosed = report.afterEscape.dialog?.open === false;
      report.escapeReturnedFocus = report.openerFocus ? report.afterEscape.focus.id === report.openerFocus.id && report.afterEscape.focus.tag === report.openerFocus.tag : null;
      if (report.escapeClosed) {
        report.steps.reopen = await reach(page, s => s.focus.onOpener);
        if (!report.steps.reopen.reached) return stop('Dialog opener not reachable after Escape.');
        await page.keyboard.press('Enter'); await settle(page);
        const reopened = await state(page);
        if (!reopened.dialog?.open || !reopened.email?.visible) return stop('Dialog did not reopen with keyboard.');
      }
    }
    report.steps.email = await reach(page, s => s.focus.onEmail && s.email.visible && !s.email.disabled && !s.email.readOnly);
    if (!report.steps.email.reached) return stop('Membership email is not keyboard reachable/editable.');
    await selectAll(page); await page.keyboard.type('bad-address');
    report.invalidBefore = await state(page);
    report.steps.invalidSubmit = await reach(page, s => s.focus.onSubmit);
    if (!report.steps.invalidSubmit.reached) return stop('No keyboard-reachable actual form submit control.');
    await page.keyboard.press('Enter'); await settle(page);
    report.invalidAfter = await state(page);
    report.steps.validEmail = await reach(page, s => s.focus.onEmail && s.email.visible && !s.email.disabled && !s.email.readOnly);
    if (!report.steps.validEmail.reached) return stop('Email no longer reachable after invalid submission.');
    await selectAll(page); await page.keyboard.type('trial@example.invalid');
    report.validBefore = await state(page);
    report.steps.validSubmit = await reach(page, s => s.focus.onSubmit);
    if (!report.steps.validSubmit.reached) return stop('Actual submit control not reachable for valid input.');
    await page.keyboard.press('Enter'); await settle(page);
    report.validAfter = await state(page);
    await page.screenshot({ path: join(output, `${name}-result.png`), fullPage: true });
    report.status = 'observed';
  } catch (error) { report.status = 'failed'; report.failure = error.stack; }
  return report;
}
