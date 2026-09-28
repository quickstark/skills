'use strict';

const joinForm = document.getElementById('join-form');
const formMessage = document.getElementById('form-message');
window.__events = window.__events || [];

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!joinForm.reportValidity()) return;

  window.__events.push({ name: 'join_started', plan: 'family' });
  formMessage.textContent = 'Ready to continue with Family membership.';
});

joinForm.addEventListener('input', () => {
  formMessage.textContent = '';
});
