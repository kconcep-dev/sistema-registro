// js/script.js

// --- 0. PROTECCIÓN DE RUTA INICIAL ---
(async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENTOS DEL DOM ---
    const form = document.getElementById('registro-form');
    const inputs = form.querySelectorAll('input');
    const submitBtn = document.getElementById('submit-btn');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');
    const qrFileInput = document.getElementById('qr-captura');
    const qrFileNameDisplay = document.getElementById('qr-file-name');
    const qrResultDisplay = document.getElementById('qr-result-display');
    const qrCanvasElement = document.getElementById("qr-canvas");
    const qrCanvas = qrCanvasElement.getContext("2d");

    // --- 2. ESTADO Y PERSISTENCIA ---
    let toastTimeout;

    // --- 3. FUNCIONES AUXILIARES ---

    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    // NUEVO: Función para actualizar el estado de "trabajo en progreso"
    function updateWorkInProgress() {
        const hasContent = Array.from(inputs).some(input => input.value.trim() !== '');
        window.isWorkInProgress = hasContent;
    }

    // NUEVO: Función para limpiar el estado de trabajo. Se expone globalmente.
    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        form.reset(); // Limpia el formulario visualmente
    };
    
    function displayLastVisitor(visitor) {
        if (visitor) {
            document.getElementById('ultimo-nombre').textContent = visitor.nombre;
            document.getElementById('ultimo-apellido').textContent = visitor.apellido;
            document.getElementById('ultimo-cedula').textContent = visitor.cedula;
            document.getElementById('ultimo-motivo').textContent = visitor.motivo;
            document.getElementById('ultimo-fecha').textContent = visitor.fecha;
            document.getElementById('ultimo-hora').textContent = visitor.hora;
        } else {
            ultimoVisitanteCard.innerHTML = '<h4>Aún no hay visitantes registrados.</h4>';
        }
    }

    async function fetchLastVisitor() {
        try {
            const { data, error } = await supabaseClient.from('visitantes').select('*').order('id', { ascending: false }).limit(1);
            if (error) throw error;
            displayLastVisitor(data.length > 0 ? data[0] : null);
        } catch (error) {
            console.error("Error al obtener último visitante:", error);
            ultimoVisitanteCard.innerHTML = '<h4>No se pudo cargar el último registro.</h4>';
        }
    }

    // --- 4. LÓGICA DEL FORMULARIO DE REGISTRO ---
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
            const fechaActual = new Date().toISOString().split("T")[0];
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const { error } = await supabaseClient.from('visitantes').insert([{ nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual }]);
            if (error) throw error;
            
            showToast("¡Registro exitoso!", "success");
            const nuevoVisitante = { nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual };
            displayLastVisitor(nuevoVisitante);
            
            clearWorkInProgress(); // Limpia el estado de trabajo
            
        } catch (err) {
            showToast("Error al registrar los datos.", "error");
            console.error("Error de Supabase al insertar:", err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrar";
        }
    });

    // --- 5. LÓGICA DEL LECTOR DE QR ---
    qrFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        qrResultDisplay.textContent = 'Procesando...';
        if (file) {
            qrFileNameDisplay.textContent = file.name;
            showToast("Procesando imagen...", "success");
        } else {
            qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
            qrResultDisplay.textContent = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                qrCanvasElement.width = img.width;
                qrCanvasElement.height = img.height;
                qrCanvas.drawImage(img, 0, 0, img.width, img.height);
                const imageData = qrCanvas.getImageData(0, 0, qrCanvasElement.width, qrCanvasElement.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    const decoder = new TextDecoder('utf-8');
                    const decodedData = decoder.decode(new Uint8Array(code.binaryData));
                    qrResultDisplay.textContent = decodedData;
                    const parts = decodedData.split('|');
                    if (parts.length >= 3) {
                        document.getElementById('cedula').value = parts[0].trim();
                        document.getElementById('nombre').value = parts[1].trim();
                        document.getElementById('apellido').value = parts[2].trim();
                        updateWorkInProgress(); // Activa el guardián
                        showToast("Datos de QR cargados.", "success");
                    } else {
                        showToast("Formato del QR no esperado.", "error");
                        qrResultDisplay.textContent += "\nError: Formato no reconocido";
                    }
                } else {
                    showToast("No se encontró un QR en la imagen.", "error");
                    qrResultDisplay.textContent = 'No se detectó ningún código QR.';
                }
            };
            img.src = imageUrl;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    });

    // --- 6. INICIALIZACIÓN Y GUARDIANES ---
    fetchLastVisitor();

    // NUEVO: Agrega listeners para detectar cambios en el formulario
    inputs.forEach(input => {
        input.addEventListener('input', updateWorkInProgress);
    });

    // NUEVO: Guardián para recargar o cerrar la pestaña
    window.addEventListener('beforeunload', (event) => {
        if (window.isWorkInProgress) {
            event.preventDefault();
            event.returnValue = ''; // Requerido por algunos navegadores
        }
    });
});