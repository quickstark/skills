"use strict";

const joinForm = document.getElementById("join-form");
const formMessage = document.getElementById("form-message");

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!joinForm.reportValidity()) return;
  window.__events = window.__events || [];
  window.__events.push({ name: "join_started", plan: "family" });
  formMessage.textContent = "Ready to continue with Family membership.";
});

document.getElementById("member-email").addEventListener("input", () => {
  formMessage.textContent = "";
});
