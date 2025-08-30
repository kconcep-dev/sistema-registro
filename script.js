document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const form = document.getElementById('registro-form');
    const submitBtn = document.getElementById('submit-btn');
    const ocrBtn = document.getElementById('process-ocr-btn');
    const ocrFileInput = document.getElementById('cedula-captura');
    const ocrResultEl = document.getElementById('resultado');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const successSound = document.getElementById('success-sound');
    const scanSound = document.getElementById('scan-sound');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');

    // --- CONFIGURACIÓN ---
    const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";

    // --- LÓGICA DEL TEMA ---
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

    // --- SISTEMA DE NOTIFICACIONES (TOAST) ---
    let toastTimeout;
    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        document.body.classList.add(`flash-${type}`);

        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
            document.body.classList.remove(`flash-success`, `flash-error`);
        }, 3000);
    }

    // --- LÓGICA PARA MOSTRAR ÚLTIMO VISITANTE ---
    function displayLastVisitor(visitor) {
        if (visitor) {
            document.getElementById('ultimo-nombre').textContent = `${visitor.nombre} ${visitor.apellido}`;
            document.getElementById('ultimo-cedula').textContent = visitor.cedula;
            document.getElementById('ultimo-hora').textContent = visitor.hora;
            ultimoVisitanteCard.style.display = 'block';
        }
    }

    async function fetchLastVisitor() {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/visitantes?select=*&order=created_at.desc&limit=1`, {
                headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
            });
            if (!response.ok) throw new Error('No se pudo obtener el último visitante.');
            
            const data = await response.json();
            if (data.length > 0) {
                displayLastVisitor(data[0]);
            }
        } catch (error) {
            console.error(error.message);
        }
    }

    // --- LÓGICA DEL FORMULARIO DE REGISTRO ---
    form.addEventListener("submit", async (e) => {
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
        
        try {
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const response = await fetch(`${supabaseUrl}/rest/v1/visitantes`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
                body: JSON.stringify([{ nombre, apellido, cedula, motivo, fecha: new Date().toISOString().split("T")[0], hora: horaActual }])
            });

            if (response.ok) {
                showToast("¡Registro exitoso!", "success");
                if (successSound) successSound.play();
                
                const nuevoVisitante = { nombre, apellido, cedula, hora: horaActual };
                displayLastVisitor(nuevoVisitante);

                form.reset();
            } else {
                const error = await response.text();
                showToast(`Error al registrar: ${error}`, "error");
            }
        } catch (err) {
            showToast("Error de conexión. Revisa tu internet.", "error");
            console.error("Error de conexión:", err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrar";
        }
    });

    // --- LÓGICA DEL OCR ---
    ocrBtn.addEventListener('click', async () => {
        const file = ocrFileInput.files[0];
        if (!file) {
            showToast("Primero selecciona una foto de la cédula.", "error");
            return;
        }

        ocrBtn.disabled = true;
        ocrBtn.textContent = "Procesando...";
        ocrResultEl.innerText = 'Reconociendo texto en la imagen...';

        try {
            const { data: { text } } = await Tesseract.recognize(file, 'spa', {
                logger: m => console.log(m) 
            });
            
            ocrResultEl.innerText = text || "No se detectó texto. Intenta con una imagen más clara.";
            if (scanSound) scanSound.play();

            const cedulaMatch = text.match(/\d{1,2}-?\d{3,4}-?\d{3,4}/);
            if (cedulaMatch) document.getElementById("cedula").value = cedulaMatch[0];
            
        } catch (err) {
            showToast("No se pudo procesar la imagen.", "error");
            ocrResultEl.innerText = 'Error al procesar la imagen. Revisa la consola para más detalles.';
            console.error("Error de Tesseract:", err);
        } finally {
            ocrBtn.disabled = false;
            ocrBtn.textContent = "Procesar Foto";
        }
    });

    // --- INICIALIZACIÓN DE LA PÁGINA ---
    fetchLastVisitor();

});

// --- SERVICE WORKER ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js")
            .then(reg => console.log("Service Worker registrado"))
            .catch(err => console.error("Error al registrar Service Worker:", err));
    });
}