// js/login.js (Versión Corregida)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE LA PANTALLA DE BIENVENIDA ---
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('login-main-content');

    // Esperamos un tiempo y luego intercambiamos la visibilidad
    setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        mainContent.style.visibility = 'visible';
    }, 2500); // 2.5 segundos de duración

    // --- ELEMENTOS DEL DOM DEL FORMULARIO ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loadingOverlay = document.getElementById('loading-overlay');
    const stepEmail = document.getElementById('step-email');
    const stepPassword = document.getElementById('step-password');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const loginBtn = document.getElementById('login-btn');

    // --- LÓGICA DEL FORMULARIO MULTI-PASO ---
    nextBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (email === '' || !email.includes('@')) {
            loginError.textContent = 'Por favor, introduce un correo válido.';
            loginError.style.display = 'block';
            return;
        }
        loginError.style.display = 'none';
        stepEmail.style.display = 'none';
        stepPassword.style.display = 'flex';
        passwordInput.focus();
    });

    backBtn.addEventListener('click', () => {
        stepPassword.style.display = 'none';
        stepEmail.style.display = 'block';
        emailInput.focus();
    });

    // --- LÓGICA DE ENVÍO FINAL ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (password === '') {
            loginError.textContent = 'Por favor, introduce tu contraseña.';
            loginError.style.display = 'block';
            return;
        }

        loadingOverlay.classList.add('visible');
        loginError.style.display = 'none';
        
        loginBtn.disabled = true;
        backBtn.disabled = true;
        loginBtn.textContent = 'Ingresando...';

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) { throw error; }

            window.location.href = 'inicio.html';

        } catch (error) {
            loadingOverlay.classList.remove('visible');
            loginError.textContent = 'Correo o contraseña incorrectos.';
            loginError.style.display = 'block';
            
            passwordInput.value = '';
            passwordInput.focus();
            
            loginBtn.disabled = false;
            backBtn.disabled = false;
            loginBtn.textContent = 'Ingresar';
        }
    });
});