window.__events=[];
const form=document.getElementById('join-form');
function submitMembership(event){event.preventDefault();if(!form.reportValidity())return;window.__events.push({name:'join_started',plan:'family'});document.getElementById('form-message').textContent='Ready to continue with Family membership.';}
form.addEventListener('submit',submitMembership);
document.getElementById('join-button').addEventListener('click',submitMembership);
