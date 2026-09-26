'use strict';
window.__events = window.__events || [];
const form = document.getElementById('join-form');
const message = document.getElementById('form-message');
const email = document.getElementById('member-email');
document.getElementById('join-button').disabled = false;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
});
email.addEventListener('input', () => { message.textContent = ''; });
