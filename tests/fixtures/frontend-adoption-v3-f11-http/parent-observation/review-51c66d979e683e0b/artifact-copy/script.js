'use strict';

const dialog = document.querySelector('#membership-dialog');
const joinButton = document.querySelector('#join-button');
const form = document.querySelector('#join-form');
const email = document.querySelector('#member-email');
const message = document.querySelector('#form-message');

joinButton.addEventListener('click', () => {
  dialog.showModal();
  email.focus();
});
document.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => joinButton.focus());
email.addEventListener('input', () => { message.textContent = ''; });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  window.__events = window.__events || [];
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
});
