// --- PROTECCIÓN DE RUTA Y CARGADOR ---
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
        document.getElementById('header-buttons').style.display = 'flex';
    }
}
checkSession();

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const form = document.getElementById('registro-form');
    const submitBtn = document.getElementById('submit-btn');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');
    
    // --- NUEVOS ELEMENTOS DEL DOM PARA QR ---
    const qrFileInput = document.getElementById('qr-captura');
    const qrFileNameDisplay = document.getElementById('qr-file-name');
    const qrResultDisplay = document.getElementById('qr-result-display');
    const qrCanvasElement = document.getElementById("qr-canvas");
    const qrCanvas = qrCanvasElement.getContext("2d");

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
            const fechaActual = new Date().toISOString().split("T")[0];
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const { error } = await supabaseClient.from('visitantes').insert([{ nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual }]);
            if (error) throw error;
            showToast("¡Registro exitoso!", "success");
            const nuevoVisitante = { nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual };
            displayLastVisitor(nuevoVisitante);
            form.reset();
        } catch (err) {
            showToast("Error al registrar los datos.", "error");
            console.error("Error de Supabase al insertar:", err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrar";
        }
    });

    // --- INICIALIZACIÓN DE LA PÁGINA ---
    fetchLastVisitor();

    // ===================================================================
    // --- LÓGICA DEL LECTOR DE QR (CON MEJORAS VISUALES) ---
    // ===================================================================

    qrFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        
        qrResultDisplay.textContent = 'Procesando...'; // Limpiar y mostrar estado
        if (file) {
            qrFileNameDisplay.textContent = file.name; // Mostrar el nombre del archivo
            showToast("Procesando imagen...", "success");
        } else {
            qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
            qrResultDisplay.textContent = ''; // Limpiar si se cancela
            return; // No hacer nada si el usuario cancela
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
                    
                    qrResultDisplay.textContent = decodedData; // Mostrar el texto crudo del QR
                    
                    const parts = decodedData.split('|');
                    if (parts.length >= 3) {
                        document.getElementById('cedula').value = parts[0].trim();
                        document.getElementById('nombre').value = parts[1].trim();
                        document.getElementById('apellido').value = parts[2].trim();
                        showToast("Datos de QR cargados.", "success");
                    } else {
                        showToast("Formato del QR no esperado.", "error");
                        qrResultDisplay.textContent += "\nError: Formato no reconocido (esperado: cedula|nombre|apellido)"; // Añadir error al recuadro
                    }
                } else {
                    showToast("No se encontró un QR en la imagen.", "error");
                    qrResultDisplay.textContent = 'No se detectó ningún código QR en la foto.'; // Informar en el recuadro
                }
            };
            img.src = imageUrl;
        };
        reader.readAsDataURL(file);

        // Limpiar el valor del input para permitir tomar la misma foto de nuevo si hay un error o se quiere repetir
        event.target.value = '';
    });
});