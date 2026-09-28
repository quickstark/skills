'use strict';
window.__events = window.__events || [];
const form = document.getElementById('join-form');
if (form) {
  const email = document.getElementById('member-email');
  const message = document.getElementById('form-message');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!email.validity.valid) {
      email.setAttribute('aria-invalid', 'true');
      message.textContent = email.validity.valueMissing ? 'Please enter your email address.' : 'Please enter a valid email address.';
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    window.__events.push({ name: 'join_started', plan: 'family' });
    message.textContent = 'Ready to continue with Family membership.';
  });
  email.addEventListener('input', () => {
    email.removeAttribute('aria-invalid');
    message.textContent = '';
  });
}
