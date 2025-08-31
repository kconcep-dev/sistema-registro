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
    const ocrBtn = document.getElementById('process-ocr-btn');
    const ocrFileInput = document.getElementById('cedula-captura');
    const ocrResultEl = document.getElementById('resultado');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');
    
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
            const { data, error } = await supabaseClient
                .from('visitantes')
                .select('*')
                .order('id', { ascending: false })
                .limit(1);
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
            const { error } = await supabaseClient
                .from('visitantes')
                .insert([{ nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual }]);
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

    // --- LÓGICA DEL OCR ---
    ocrBtn.addEventListener('click', async () => {
        const file = ocrFileInput.files[0];
        if (!file) {
            showToast("Primero selecciona una foto de la cédula.", "error");
            return;
        }
        ocrBtn.disabled = true;
        ocrBtn.textContent = "Procesando...";
        ocrResultEl.innerText = 'Reconociendo texto...';
        try {
            const { data: { text } } = await Tesseract.recognize(file, 'spa');
            ocrResultEl.innerText = text || "No se detectó texto.";
            const cedulaMatch = text.match(/\d{1,2}-?\d{3,4}-?\d{3,4}/);
            if (cedulaMatch) document.getElementById("cedula").value = cedulaMatch[0];
        } catch (err) {
            showToast("No se pudo procesar la imagen.", "error");
            ocrResultEl.innerText = 'Error al procesar.';
            console.error("Error de Tesseract:", err);
        } finally {
            ocrBtn.disabled = false;
            ocrBtn.textContent = "Procesar Foto";
        }
    });

    // --- INICIALIZACIÓN DE LA PÁGINA ---
    fetchLastVisitor();

    // ===================================================================
    // --- LÓGICA DEL LECTOR DE QR (CON CONTROLES AVANZADOS DE CÁMARA) ---
    // ===================================================================

    const startScanBtn = document.getElementById('start-scan-btn');
    const qrCanvasElement = document.getElementById("qr-canvas");
    const qrCanvas = qrCanvasElement.getContext("2d");
    const videoElement = document.createElement("video");

    let scanning = false;
    let stream = null; 

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop(); // Apaga la cámara y la linterna
            });
        }
        scanning = false;
        qrCanvasElement.style.display = 'none';
        startScanBtn.style.display = 'block';
    }

    qrcode.callback = (respuesta) => {
        if (respuesta) {
            scanning = false;
            const parts = respuesta.split('|');
            if (parts.length >= 3) {
                const cedula = parts[0].trim();
                const nombres = parts[1].trim();
                const apellidos = parts[2].trim();
                document.getElementById('cedula').value = cedula;
                document.getElementById('nombre').value = nombres;
                document.getElementById('apellido').value = apellidos;
                showToast("Datos de QR cargados correctamente.", "success");
            } else {
                showToast("El formato del QR no es el esperado.", "error");
            }
            stopCamera();
        }
    };

    function tick() {
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            qrCanvasElement.height = videoElement.videoHeight;
            qrCanvasElement.width = videoElement.videoWidth;
            qrCanvas.drawImage(videoElement, 0, 0, qrCanvasElement.width, qrCanvasElement.height);
            try {
                qrcode.decode();
            } catch (e) {
                // Fallo esperado hasta que encuentre un QR
            }
        }
        if (scanning) {
            requestAnimationFrame(tick);
        }
    }

    startScanBtn.addEventListener('click', async () => {
        // --- AQUÍ ESTÁ LA MAGIA ---
        const constraints = {
            video: {
                facingMode: "environment", // Cámara trasera
                // Peticiones avanzadas al navegador
                advanced: [
                    { torch: true },         // Pedir que encienda la linterna
                    { zoom: 3.0 },            // Pedir un zoom de 2x
                    { focusMode: 'continuous' } // Pedir que intente enfocar continuamente
                ]
            }
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Si el navegador soporta estas funciones, las aplicamos
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            // Encender la linterna (torch) si está disponible
            if (capabilities.torch) {
                track.applyConstraints({
                    advanced: [{ torch: true }]
                });
            }

            scanning = true;
            startScanBtn.style.display = 'none';
            qrCanvasElement.style.display = 'block';
            videoElement.srcObject = stream;
            videoElement.setAttribute("playsinline", true);
            videoElement.play();
            requestAnimationFrame(tick);
        } catch (err) {
            console.error("Error al acceder a la cámara con constraints avanzados:", err);
            showToast("No se pudo iniciar la cámara avanzada.", "error");
        }
    });
});