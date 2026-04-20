import { signUp } from './auth.js';

const form = document.getElementById('signup-form');
const status = document.getElementById('signup-status');
const submitButton = document.getElementById('signup-button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Creating account...';

  const fullName = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const condition = document.getElementById('condition').value;
  const password = document.getElementById('password').value;

  try {
    const { error } = await signUp({ fullName, email, password, condition });

    if (error) {
      status.textContent = error.message || 'Unable to create your account.';
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
      return;
    }

    status.textContent = 'Account created. Verifying session...';
    window.location.href = 'dashboard.html';
  } catch (exception) {
    status.textContent = 'We could not complete registration. Please try again.';
    submitButton.disabled = false;
    submitButton.textContent = 'Create account';
  }
});