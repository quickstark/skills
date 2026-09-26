const dialog = document.querySelector('#membership-dialog');
const joinButton = document.querySelector('#join-button');
const form = document.querySelector('#join-form');
const message = document.querySelector('#form-message');

window.__events = window.__events || [];

joinButton.addEventListener('click', () => {
  message.textContent = '';
  dialog.showModal();
});

document.querySelector('.close-button').addEventListener('click', () => dialog.close());

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
});
