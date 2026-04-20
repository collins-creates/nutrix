import { signIn, getSession } from './auth.js';

const form = document.getElementById('login-form');
const status = document.getElementById('login-status');
const submitButton = document.getElementById('login-button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Authenticating...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { error } = await signIn({ email, password });

    if (error) {
      console.error('Sign-in error:', error);
      status.textContent = error.message || 'Unable to sign in with that email and password.';
      submitButton.disabled = false;
      submitButton.textContent = 'Sign in';
      return;
    }

    // Wait 500ms for session to sync before redirecting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const session = await getSession();
    if (!session) {
      console.error('No session after sign-in');
      status.textContent = 'Session error. Please try again.';
      submitButton.disabled = false;
      submitButton.textContent = 'Sign in';
      return;
    }

    window.location.href = 'dashboard.html';
  } catch (exception) {
    console.error('Login exception:', exception);
    status.textContent = 'Unable to sign in. Please try again.';
    submitButton.disabled = false;
    submitButton.textContent = 'Sign in';
  }
});