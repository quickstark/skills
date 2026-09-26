const dialog = document.querySelector('#join-dialog');
const form = document.querySelector('#join-form');
const email = document.querySelector('#member-email');
const message = document.querySelector('#form-message');
window.__events = [];

document.querySelector('#join-button').addEventListener('click', () => {
  dialog.showModal();
  email.focus();
});
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  window.__events.push({ name: 'join_started', plan: 'family' });
  message.textContent = 'Ready to continue with Family membership.';
});
email.addEventListener('input', () => { message.textContent = ''; });
