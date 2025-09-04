// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE LA PANTALLA DE BIENVENIDA ---
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('login-main-content');

    // Esperamos un tiempo y luego intercambiamos la visibilidad
    setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        mainContent.style.visibility = 'visible';
    }, 2500); // 2.5 segundos de duración

    // --- LÓGICA DEL TEMA (ESPECÍFICA PARA LOGIN.HTML) ---
    const loginThemeToggleBtn = document.getElementById('login-theme-toggle');
    if (loginThemeToggleBtn) {
        // Aplicar tema guardado al cargar la página
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            loginThemeToggleBtn.textContent = '☀️';
        }
        // Evento para cambiar el tema
        loginThemeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            loginThemeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            localStorage.setItem('theme', theme);
        });
    }

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
        stepPassword.style.display = 'block';
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
            
            // **MEJORA DE UX:** No regresamos al paso del correo.
            // Mantenemos al usuario en la pantalla de contraseña.
            passwordInput.value = ''; // Limpiamos la contraseña
            passwordInput.focus();   // Ponemos el foco para que pueda reintentar
            
            loginBtn.disabled = false;
            backBtn.disabled = false;
            loginBtn.textContent = 'Ingresar';
        }
    });
});