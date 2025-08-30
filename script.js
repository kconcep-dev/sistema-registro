// Espera a que todo el HTML esté cargado para ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DEL TEMA OSCURO/CLARO ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');

    // Al cargar la página, aplicar el tema guardado
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.textContent = '☀️';
    }

    // Evento para el botón
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        let theme = 'light';
        if (document.body.classList.contains('dark-mode')) {
            theme = 'dark';
            themeToggleBtn.textContent = '☀️'; // Cambia a icono de sol
        } else {
            themeToggleBtn.textContent = '🌙'; // Cambia a icono de luna
        }
        localStorage.setItem('theme', theme);
    });


    // --- CONFIGURACIÓN DE LA APLICACIÓN ---
    const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
    
    const form = document.getElementById("registro-form");
    const submitBtn = document.getElementById("submit-btn");
    const feedbackMessage = document.getElementById("feedback-message");
    const successSound = document.getElementById("success-sound");

    // --- LÓGICA DE REGISTRO DEL FORMULARIO ---
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const cedula = document.getElementById("cedula").value.trim();
        const motivo = document.getElementById("motivo").value.trim();

        if (!nombre || !apellido || !cedula || !motivo) {
            mostrarMensaje("Por favor, completa todos los campos.", "error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando...";
        
        await sendToBackend(nombre, apellido, cedula, motivo);

        submitBtn.disabled = false;
        submitBtn.textContent = "Registrar";
    });

    async function sendToBackend(nombre, apellido, cedula, motivo) {
        const fecha = new Date().toISOString().split("T")[0];
        const hora = new Date().toLocaleTimeString("es-PA", { hour12: false });

        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/visitantes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`
                },
                body: JSON.stringify([{ nombre, apellido, cedula, motivo, fecha, hora }])
            });

            if (response.ok) {
                mostrarMensaje("¡Registro exitoso!", "success");
                if (successSound) successSound.play();
                form.reset();
            } else {
                const error = await response.text();
                mostrarMensaje(`Error al registrar: ${error}`, "error");
                console.error("Error al registrar:", error);
            }
        } catch (err) {
            mostrarMensaje("Error de conexión. Revisa tu internet.", "error");
            console.error("Error de conexión:", err);
        }
    }

    // Función para mostrar mensajes en la UI
    function mostrarMensaje(mensaje, tipo) {
        feedbackMessage.textContent = mensaje;
        feedbackMessage.className = `feedback ${tipo}`;
        
        setTimeout(() => {
            feedbackMessage.textContent = "";
            feedbackMessage.className = "feedback";
        }, 5000);
    }
});

// --- FUNCIONES OCR (Se mantienen igual, fuera del DOMContentLoaded) ---

// Procesar imagen capturada desde cámara
function extraerTextoDesdeCaptura() {
    const archivo = document.getElementById("cedula-captura").files[0];
    if (!archivo) {
        alert("Toma una foto de la cédula primero.");
        return;
    }
    procesarImagenOCR(archivo);
}

// Procesar imagen subida desde galería
function extraerTextoDesdeArchivo() {
    const archivo = document.getElementById("cedula-img").files[0];
    if (!archivo) {
        alert("Selecciona una imagen desde tu galería.");
        return;
    }
    procesarImagenOCR(archivo);
}

// Función OCR con Tesseract.js
function procesarImagenOCR(archivo) {
    document.getElementById("resultado").innerText = 'Procesando imagen...';
    Tesseract.recognize(archivo, 'spa', { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            document.getElementById("resultado").innerText = text;
            document.getElementById("scan-sound").play();

            const cedulaMatch = text.match(/\d{1,2}-\d{3,}-\d{4}/);
            if (cedulaMatch) {
                document.getElementById("cedula").value = cedulaMatch[0];
            }

            const nombreMatch = text.match(/[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,}/);
            if (nombreMatch) {
                const partes = nombreMatch[0].split(" ");
                document.getElementById("nombre").value = partes.slice(0, -1).join(" ");
                document.getElementById("apellido").value = partes.slice(-1).join(" ");
            }

            alert("Texto detectado. Revisa y ajusta los campos si es necesario.");
        })
        .catch(err => {
            console.error("Error al procesar imagen:", err);
            alert("No se pudo leer la imagen. Intenta con una foto más clara.");
            document.getElementById("resultado").innerText = 'Error al procesar.';
        });
}

// --- SERVICE WORKER ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js")
            .then(reg => console.log("Service Worker registrado"))
            .catch(err => console.error("Error al registrar Service Worker:", err));
    });
}