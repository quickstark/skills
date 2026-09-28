'use strict';
window.__events = window.__events || [];
const form = document.getElementById('join-form');
const email = document.getElementById('member-email');
const error = document.getElementById('email-error');
const message = document.getElementById('form-message');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  email.value = email.value.trim();
  if (!email.validity.valid) {
    email.setAttribute('aria-invalid', 'true');
    error.textContent = email.validity.valueMissing ? 'Enter your email address to continue.' : 'Enter a valid email address, such as you@example.com.';
    message.textContent = '';
    email.focus();
    return;
  }
  email.removeAttribute('aria-invalid');
  error.textContent = '';
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
});
email.addEventListener('input', () => {
  email.removeAttribute('aria-invalid');
  error.textContent = '';
  message.textContent = '';
});
