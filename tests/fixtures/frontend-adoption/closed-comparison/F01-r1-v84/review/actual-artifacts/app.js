'use strict';

const form = document.getElementById('join-form');
const message = document.getElementById('form-message');
window.__events = window.__events || [];

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
});

form.addEventListener('input', () => {
  message.textContent = '';
});
