// Espera a que todo el HTML esté cargado para ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURACIÓN ---
    const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";
    
    const form = document.getElementById("registro-form");
    const submitBtn = document.getElementById("submit-btn");
    const feedbackMessage = document.getElementById("feedback-message");
    const successSound = document.getElementById("success-sound"); // Opcional

    // --- LÓGICA DE REGISTRO ---
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

        // Deshabilitar botón para evitar envíos múltiples
        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando...";
        
        await sendToBackend(nombre, apellido, cedula, motivo);

        // Habilitar el botón nuevamente
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
        feedbackMessage.className = `feedback ${tipo}`; // Asigna clase 'success' o 'error'
        
        // Ocultar el mensaje después de 5 segundos
        setTimeout(() => {
            feedbackMessage.textContent = "";
            feedbackMessage.className = "feedback";
        }, 5000);
    }
    
    // Aquí puedes dejar el resto de tu código (funciones OCR y Service Worker)
    // ...
});

// El resto de tu código (OCR y Service Worker) puede ir aquí o dentro del DOMContentLoaded.
// Por ahora, lo dejamos fuera para mayor claridad.

function extraerTextoDesdeCaptura() { /* ... tu código actual ... */ }
function extraerTextoDesdeArchivo() { /* ... tu código actual ... */ }
function procesarImagenOCR(archivo) { /* ... tu código actual ... */ }
if ("serviceWorker" in navigator) { /* ... tu código actual ... */ }