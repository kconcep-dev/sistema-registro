// --- PROTECCIÓN DE RUTA Y CARGADOR ---
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        // Si hay sesión, ocultamos el cargador y mostramos el contenido.
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
        document.getElementById('header-buttons').style.display = 'flex';
    }
}
checkSession();

// El código específico de esta página se ejecuta después de que el DOM esté listo.
document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM (Solo los de esta página) ---
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

    // --- LÓGICA DEL LECTOR DE QR ---
    function onScanSuccess(decodedText, decodedResult) {
        const resultElement = document.getElementById('qr-result');
        resultElement.textContent = `Resultado: ${decodedText}`;
        resultElement.style.display = 'block';
        
        console.log(`Resultado del QR: ${decodedText}`);

        // Basado en el formato: "9-762-2281|Kevin Elieser|Concepcion Rodriguez||M|..."
        const parts = decodedText.split('|');
        
        // Verificamos que el QR tenga al menos los 3 campos que necesitamos
        if (parts.length >= 3) {
            const cedula = parts[0].trim();
            const nombres = parts[1].trim(); // El segundo campo contiene todos los nombres
            const apellidos = parts[2].trim(); // El tercer campo contiene todos los apellidos

            // Rellenamos el formulario con los datos correctos
            document.getElementById('cedula').value = cedula;
            document.getElementById('nombre').value = nombres;
            document.getElementById('apellido').value = apellidos;
            
            showToast("Datos de QR cargados correctamente.", "success");
            
            // Detenemos el escáner para evitar que siga funcionando
            html5QrcodeScanner.clear().catch(error => {
                console.error("Fallo al detener el escáner.", error);
            });
            document.getElementById('qr-reader').style.display = 'none';

        } else {
            showToast("El formato del QR no es el esperado.", "error");
        }
    }

    function onScanFailure(error) {
      // No hacemos nada en caso de fallo para que el usuario pueda seguir intentando
    }
    
    // Creamos la instancia del escáner con la configuración mejorada
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", 
        { 
            fps: 15,
            qrbox: { 
                width: 225,
                height: 225 
            },
            rememberLastUsedCamera: true,
            supportedScanTypes: [
                Html5QrcodeScanType.SCAN_TYPE_CAMERA
            ],
            videoConstraints: {
                facingMode: "environment",
                focusMode: "continuous",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        /* verbose= */ false);
    
    // Iniciamos el escáner
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    
});