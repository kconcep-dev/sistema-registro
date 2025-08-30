document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DEL TEMA OSCURO/CLARO ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.textContent = '☀️';
    }
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    });

    // --- CONFIGURACIÓN DE LA APLICACIÓN ---
    const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
    const form = document.getElementById("registro-form");
    const submitBtn = document.getElementById("submit-btn");
    const successSound = document.getElementById("success-sound");

    // --- NUEVA FUNCIÓN DE NOTIFICACIÓN (TOAST) ---
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast-notification');
        const toastMessage = document.getElementById('toast-message');

        toastMessage.textContent = message;
        toast.className = `toast show ${type}`;
        document.body.classList.add(`flash-${type}`);

        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
            document.body.classList.remove(`flash-${type}`);
        }, 3000); // La notificación dura 3 segundos
    }

    // --- LÓGICA DE REGISTRO DEL FORMULARIO ---
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const cedula = document.getElementById("cedula").value.trim();
        const motivo = document.getElementById("motivo").value.trim();

        if (!nombre || !apellido || !cedula || !motivo) {
            showToast("Por favor, completa todos los campos.", "error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando...";
        
        await sendToBackend(nombre, apellido, cedula, motivo);

        submitBtn.disabled = false;
        submitBtn.textContent = "Registrar";
    });

    async function sendToBackend(nombre, apellido, cedula, motivo) {
        // ... (resto de la función igual)
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/visitantes`, { /* ... */ });
            if (response.ok) {
                showToast("¡Registro exitoso!");
                if (successSound) successSound.play();
                form.reset();
            } else {
                const error = await response.text();
                showToast(`Error al registrar: ${error}`, "error");
            }
        } catch (err) {
            showToast("Error de conexión. Revisa tu internet.", "error");
        }
    }
});


// --- FUNCIONES OCR (MODIFICADAS) ---
async function procesarImagenOCR(file, button) {
    button.disabled = true;
    button.textContent = "Procesando...";
    document.getElementById("resultado").innerText = 'Procesando imagen...';

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'spa');
        document.getElementById("resultado").innerText = text;
        document.getElementById("scan-sound").play();
        // Lógica de autocompletado...
    } catch (err) {
        console.error("Error al procesar imagen:", err);
        document.getElementById("resultado").innerText = 'Error al leer la imagen.';
        // Usamos el Toast para el error
        document.getElementById('toast-notification').className = 'toast show error';
        document.getElementById('toast-message').textContent = 'No se pudo leer la imagen.';
        setTimeout(() => {
            document.getElementById('toast-notification').className = 'toast';
        }, 3000);
    } finally {
        button.disabled = false;
        button.textContent = "Procesar Foto";
    }
}

function extraerTextoDesdeCaptura(event) {
    const file = document.getElementById("cedula-captura").files[0];
    if (!file) {
        // Usamos el Toast
        document.getElementById('toast-notification').className = 'toast show error';
        document.getElementById('toast-message').textContent = 'Toma una foto primero.';
        setTimeout(() => {
            document.getElementById('toast-notification').className = 'toast';
        }, 3000);
        return;
    }
    procesarImagenOCR(file, event.target);
}

// ... (El resto de funciones como service worker quedan igual) ...