/**
 * Controla la secuencia de bienvenida y el formulario de acceso en dos pasos.
 * Se ejecuta cuando el DOM está listo para asegurar que todos los nodos existen.
 */
document.addEventListener('DOMContentLoaded', () => {

    /*
     * La pantalla de bienvenida se oculta tras un breve retraso para simular
     * una introducción animada antes de mostrar el formulario principal.
     */
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('login-main-content');

    setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        mainContent.style.visibility = 'visible';
    }, 2500);

    /*
     * Referencias a los elementos del formulario para evitar búsquedas
     * repetidas y centralizar cualquier cambio de estructura futura.
     */
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
    const loginBtnLabel = loginBtn ? loginBtn.querySelector('.button-label') : null;

    /**
     * Asegura que un campo dado reciba el foco visual y de teclado sin
     * provocar saltos bruscos en pantallas móviles o de escritorio.
     */
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

    /**
     * Cambia entre las vistas del formulario multi-paso y orienta al usuario
     * enfocando el campo adecuado en el paso mostrado.
     */
    const toggleStepVisibility = (stepToHide, stepToShow, fieldToFocus) => {
        stepToHide.classList.add('is-hidden');
        stepToShow.classList.remove('is-hidden');
        focusField(fieldToFocus);
    };

    /**
     * Simula un clic únicamente cuando el botón objetivo está habilitado.
     * Útil para reutilizar la lógica de los botones desde eventos de teclado.
     */
    const clickIfEnabled = (button) => {
        if (!button || button.disabled) return;
        button.click();
    };

    /*
     * Paso 1: validar correo electrónico y avanzar al paso de contraseña.
     * Paso 2: permitir volver atrás y manejar accesos por teclado.
     */
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

    /*
     * Envío final: bloquea la interfaz, muestra retroalimentación visual y
     * realiza la autenticación contra Supabase. Restablece el estado ante
     * errores y dirige al usuario al panel principal cuando tiene éxito.
     */
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
        if (loginBtnLabel) {
            loginBtnLabel.textContent = 'Ingresando...';
        } else {
            loginBtn.textContent = 'Ingresando...';
        }

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
            if (loginBtnLabel) {
                loginBtnLabel.textContent = 'Ingresar';
            } else {
                loginBtn.textContent = 'Ingresar';
            }
        }
    });
});
