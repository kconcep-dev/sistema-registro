// --- CONFIGURACIÓN ---
// Estas son tus "llaves" públicas para conectar con tu proyecto de Supabase.
const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
// Creamos un "cliente" de Supabase que usaremos para todas las interacciones.
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- ELEMENTOS DEL DOM ---
// Obtenemos los elementos del formulario para poder interactuar con ellos.
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

// --- LÓGICA DE LOGIN ---
// Añadimos un "escuchador" que se activa cuando el usuario intenta enviar el formulario.
loginForm.addEventListener('submit', async (e) => {
    // Prevenimos que la página se recargue, que es el comportamiento por defecto.
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Deshabilitamos el botón para evitar múltiples clics.
    loginBtn.disabled = true;
    loginBtn.textContent = 'Ingresando...';
    loginError.style.display = 'none'; // Ocultamos errores previos.

    try {
        // Esta es la función clave: le pedimos a Supabase que intente iniciar sesión.
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // Si Supabase devuelve un error (ej: contraseña incorrecta), lo lanzamos para que lo capture el 'catch'.
        if (error) {
            throw error;
        }

        // Si no hay error, el login fue exitoso. Redirigimos al usuario a la página principal.
        window.location.href = 'index.html';

    } catch (error) {
        // Si ocurre cualquier error, mostramos un mensaje genérico.
        loginError.textContent = 'Correo o contraseña incorrectos.';
        loginError.style.display = 'block';
    } finally {
        // Este bloque se ejecuta siempre, haya error o no.
        // Habilitamos el botón nuevamente.
        loginBtn.disabled = false;
        loginBtn.textContent = 'Ingresar';
    }
});