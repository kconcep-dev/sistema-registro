// js/script.js

// --- 0. PROTECCIÓN DE RUTA INICIAL ---
(async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
        // Este header-buttons no existe en el HTML de index.html, pero no causa error.
        // Se puede eliminar esta línea si se desea.
        // document.getElementById('header-buttons').style.display = 'flex';
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENTOS DEL DOM ---
    const form = document.getElementById('registro-form');
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
    const FORM_STORAGE_KEY = 'activeRegistroForm'; // Clave para sessionStorage

    // --- 3. FUNCIONES AUXILIARES ---

    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        // El efecto flash no es ideal para esta página, lo comentamos.
        // document.body.classList.add(`flash-${type}`);
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
            // document.body.classList.remove(`flash-success`, `flash-error`);
        }, 3000);
    }

    // NUEVO: Funciones para manejar el estado de trabajo en progreso
    function updateWorkInProgress() {
        const formData = getFormData();
        const hasContent = Object.values(formData).some(value => value.trim() !== '');
        window.isWorkInProgress = hasContent;
    }

    window.clearWorkInProgress = () => {
        sessionStorage.removeItem(FORM_STORAGE_KEY);
        window.isWorkInProgress = false;
        form.reset(); // También reseteamos el formulario visual
    };

    // NUEVO: Guardar datos del formulario en sessionStorage
    function saveFormData() {
        const formData = getFormData();
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
        updateWorkInProgress();
    }

    // NUEVO: Cargar datos del formulario desde sessionStorage
    function loadFormData() {
        const savedData = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (savedData) {
            const formData = JSON.parse(savedData);
            document.getElementById('nombre').value = formData.nombre;
            document.getElementById('apellido').value = formData.apellido;
            document.getElementById('cedula').value = formData.cedula;
            document.getElementById('motivo').value = formData.motivo;
            updateWorkInProgress();
        }
    }

    // NUEVO: Obtener datos del formulario como un objeto
    function getFormData() {
        return {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            cedula: document.getElementById('cedula').value,
            motivo: document.getElementById('motivo').value,
        };
    }
    
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
        const { nombre, apellido, cedula, motivo } = getFormData();
        
        if (!nombre.trim() || !apellido.trim() || !cedula.trim() || !motivo.trim()) {
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
            
            // Limpia el estado de trabajo
            clearWorkInProgress();
            
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
        // ... (El código de QR no necesita cambios y se mantiene igual)
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
                        saveFormData(); // Guarda los datos autocompletados
                        showToast("Datos de QR cargados.", "success");
                    } else {
                        showToast("Formato del QR no esperado.", "error");
                        qrResultDisplay.textContent += "\nError: Formato no reconocido (esperado: cedula|nombre|apellido)";
                    }
                } else {
                    showToast("No se encontró un QR en la imagen.", "error");
                    qrResultDisplay.textContent = 'No se detectó ningún código QR en la foto.';
                }
            };
            img.src = imageUrl;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    });

    // --- 6. INICIALIZACIÓN DE LA PÁGINA ---
    fetchLastVisitor();
    loadFormData(); // Carga datos guardados al iniciar la página

    // NUEVO: Agrega listeners para guardar datos mientras se escribe
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', saveFormData);
    });
});