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

    const focusField = (field) => {
        requestAnimationFrame(() => {
            const isMobileView = window.matchMedia('(max-width: 768px)').matches ||
                window.matchMedia('(pointer: coarse)').matches;

            if (!isMobileView && typeof field.focus === 'function') {
                try {
                    field.focus({ preventScroll: true });
                } catch (error) {
                    field.focus();
                }
            }
            if (typeof field.scrollIntoView === 'function') {
                try {
                    field.scrollIntoView({ block: 'center', behavior: 'smooth' });
                } catch (error) {
                    field.scrollIntoView();
                }
            }
        });
    };

    const toggleStepVisibility = (stepToHide, stepToShow, fieldToFocus) => {
        stepToHide.classList.add('is-hidden');
        stepToShow.classList.remove('is-hidden');
        focusField(fieldToFocus);
    };

    const clickIfEnabled = (button) => {
        if (!button || button.disabled) return;
        button.click();
    };

    // --- LÓGICA DEL FORMULARIO MULTI-PASO ---
    nextBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (email === '' || !email.includes('@')) {
            loginError.textContent = 'Por favor, introduce un correo válido.';
            loginError.style.display = 'block';
            return;
        }
        loginError.style.display = 'none';
        toggleStepVisibility(stepEmail, stepPassword, passwordInput);
    });

    backBtn.addEventListener('click', () => {
        toggleStepVisibility(stepPassword, stepEmail, emailInput);
    });

    emailInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        clickIfEnabled(nextBtn);
    });

    passwordInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        clickIfEnabled(loginBtn);
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
            focusField(passwordInput);
            
            loginBtn.disabled = false;
            backBtn.disabled = false;
            loginBtn.textContent = 'Ingresar';
        }
    });
});
