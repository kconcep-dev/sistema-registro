// login.js

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
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

    // --- LÓGICA DE ENVÍO FINAL (CORREGIDA) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (password === '') {
            loginError.textContent = 'Por favor, introduce tu contraseña.';
            loginError.style.display = 'block';
            return;
        }

        // 1. MOSTRAMOS LA RETROALIMENTACIÓN VISUAL
        loadingOverlay.classList.add('visible');
        loginError.style.display = 'none';
        
        // --- AÑADIDO DE VUELTA ---
        // Cambiamos el estado de los botones para que el usuario no pueda hacer doble clic
        loginBtn.disabled = true;
        backBtn.disabled = true;
        loginBtn.textContent = 'Ingresando...';

        try {
            // Simulamos una pequeña demora para que la animación sea visible
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            // Si el login es exitoso, la redirección se encarga de todo.
            window.location.href = 'inicio.html';

        } catch (error) {
            // 2. SI HAY ERROR, OCULTAMOS LA PANTALLA DE CARGA Y RESTAURAMOS TODO
            loadingOverlay.classList.remove('visible');
            loginError.textContent = 'Correo o contraseña incorrectos.';
            loginError.style.display = 'block';
            stepPassword.style.display = 'none';
            stepEmail.style.display = 'block';
            
            // --- AÑADIDO DE VUELTA ---
            // Restauramos los botones para que el usuario pueda intentar de nuevo
            loginBtn.disabled = false;
            backBtn.disabled = false;
            loginBtn.textContent = 'Acceder';
        }
    });
});