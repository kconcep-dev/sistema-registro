// --- ELEMENTOS DEL DOM ---
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

// --- LÓGICA DE LOGIN ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Ingresando...';
    loginError.style.display = 'none';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        // Redirige a la página de inicio.
        window.location.href = 'inicio.html';

    } catch (error) {
        loginError.textContent = 'Correo o contraseña incorrectos.';
        loginError.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Ingresar';
    }
});