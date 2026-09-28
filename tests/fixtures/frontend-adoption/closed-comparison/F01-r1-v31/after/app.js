'use strict';

const form = document.getElementById('join-form');
const email = document.getElementById('member-email');
const error = document.getElementById('email-error');
const message = document.getElementById('form-message');

email.addEventListener('input', () => {
  email.removeAttribute('aria-invalid');
  error.hidden = true;
  message.hidden = true;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  email.value = email.value.trim();
  message.hidden = true;

  if (!email.validity.valid) {
    error.textContent = email.validity.valueMissing
      ? 'Enter your email address to continue.'
      : 'Enter a valid email address, such as you@example.com.';
    error.hidden = false;
    email.setAttribute('aria-invalid', 'true');
    email.focus();
    return;
  }

  error.hidden = true;
  email.removeAttribute('aria-invalid');
  window.__events = window.__events || [];
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
  message.hidden = false;
});
