document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    const stepEmail = document.getElementById('step-email');
    const stepPassword = document.getElementById('step-password');

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const loginBtn = document.getElementById('login-btn');

    // --- LÓGICA DEL FORMULARIO MULTI-PASO ---

    // 1. Evento para el botón "Siguiente"
    nextBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        // Validación simple de que el correo no esté vacío
        if (email === '' || !email.includes('@')) {
            loginError.textContent = 'Por favor, introduce un correo válido.';
            loginError.style.display = 'block';
            return;
        }
        loginError.style.display = 'none';

        // Oculta el paso del correo y muestra el de la contraseña
        stepEmail.style.display = 'none';
        stepPassword.style.display = 'block';
        passwordInput.focus(); // Pone el cursor en el campo de contraseña
    });

    // 2. Evento para el botón "Atrás"
    backBtn.addEventListener('click', () => {
        // Oculta el paso de la contraseña y muestra el del correo
        stepPassword.style.display = 'none';
        stepEmail.style.display = 'block';
        emailInput.focus(); // Pone el cursor en el campo de correo
    });

    // 3. Evento para el envío final del formulario
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtenemos los valores de ambos inputs
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (password === '') {
            loginError.textContent = 'Por favor, introduce tu contraseña.';
            loginError.style.display = 'block';
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Ingresando...';
        backBtn.disabled = true; // Deshabilitamos también el de "atrás"
        loginError.style.display = 'none';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            window.location.href = 'inicio.html';

        } catch (error) {
            loginError.textContent = 'Correo o contraseña incorrectos.';
            loginError.style.display = 'block';
            // Si hay un error, volvemos al paso del email por si se equivocó allí
            stepPassword.style.display = 'none';
            stepEmail.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Acceder';
            backBtn.disabled = false;
        }
    });
});