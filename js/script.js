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
    const mainForm = document.getElementById('registro-form');
    const mainFormInputs = mainForm.querySelectorAll('input[type="text"]');
    
    // Elementos del QR por imagen
    const qrCaptureInput = document.getElementById('qr-captura');
    const qrChooseInput = document.getElementById('qr-elegir');
    const qrFileNameDisplay = document.getElementById('qr-file-name');
    const imageResultBox = document.getElementById('image-result-box');
    const qrCanvasElement = document.getElementById("qr-canvas");
    const qrCanvas = qrCanvasElement.getContext("2d");

    // Elementos del QR en vivo (Scanbot)
    const btnScanLive = document.getElementById('btn-scan-live');
    const scanbotResultBox = document.getElementById('scanbot-result-box');

    // Elementos del Modal
    const modalRegistro = document.getElementById('modal-registro-qr');
    const modalForm = document.getElementById('modal-form-registro');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-registro');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal-registro');
    const btnSubmitModal = document.getElementById('btn-submit-modal-registro');

    // Otros elementos
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');

    // --- 2. ESTADO Y PERSISTENCIA ---
    let toastTimeout;
    let scanbotSDK;
    let activeBarcodeScanner;

    // --- 3. FUNCIONES AUXILIARES ---
    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }
    
    // Función global para limpiar formularios (ahora también limpia el modal)
    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        mainForm.reset();
        modalForm.reset();
        qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
        imageResultBox.style.display = 'none';
        scanbotResultBox.style.display = 'none';
    };

    function updateWorkInProgress() {
        // El guardián ahora se basa en si el formulario principal tiene texto
        const hasContent = Array.from(mainFormInputs).some(input => input.value.trim() !== '');
        window.isWorkInProgress = hasContent;
    }

    function displayLastVisitor(visitor) {
        // ... (sin cambios)
    }

    async function fetchLastVisitor() {
        // ... (sin cambios)
    }

    // --- 4. LÓGICA DEL FORMULARIO PRINCIPAL (MANUAL) ---
    mainForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Lógica de registro manual
        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const cedula = document.getElementById("cedula").value.trim();
        const motivo = document.getElementById("motivo").value.trim();

        if (!nombre || !apellido || !cedula || !motivo) {
            showToast("Por favor, completa todos los campos.", "error");
            return;
        }
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando...";
        try {
            const fechaActual = new Date().toISOString().split("T")[0];
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const { data: nuevoVisitante, error } = await supabaseClient.from('visitantes').insert([{ nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual }]).select().single();
            if (error) throw error;
            
            showToast("¡Registro exitoso!", "success");
            displayLastVisitor(nuevoVisitante);
            clearWorkInProgress();
        } catch (err) {
            showToast("Error al registrar los datos.", "error");
            console.error("Error de Supabase al insertar:", err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrar";
        }
    });

    // --- 5. LÓGICA DEL MODAL DE REGISTRO ---
    
    // Función para abrir el modal
    function abrirModalRegistro(datos) {
        // Llenar el formulario del modal
        document.getElementById('modal-nombre').value = datos.nombre || '';
        document.getElementById('modal-apellido').value = datos.apellido || '';
        document.getElementById('modal-cedula').value = datos.cedula || '';
        document.getElementById('modal-motivo').value = ''; // Limpiar motivo
        
        // Enfocar en el campo de motivo para conveniencia
        document.getElementById('modal-motivo').focus();

        // Mostrar el modal
        modalRegistro.classList.add('visible');
    }

    // Función para cerrar el modal
    function cerrarModalRegistro() {
        modalRegistro.classList.remove('visible');
    }

    // Eventos de cierre del modal
    btnCerrarModal.addEventListener('click', cerrarModalRegistro);
    btnCancelarModal.addEventListener('click', cerrarModalRegistro);

    // Evento para registrar desde el modal
    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById("modal-nombre").value.trim();
        const apellido = document.getElementById("modal-apellido").value.trim();
        const cedula = document.getElementById("modal-cedula").value.trim();
        const motivo = document.getElementById("modal-motivo").value.trim();

        if (!nombre || !apellido || !cedula || !motivo) {
            showToast("Por favor, completa el motivo de la visita.", "error");
            return;
        }
        
        btnSubmitModal.disabled = true;
        btnSubmitModal.textContent = "Registrando...";

        try {
            const fechaActual = new Date().toISOString().split("T")[0];
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const { data: nuevoVisitante, error } = await supabaseClient.from('visitantes').insert([{ nombre, apellido, cedula, motivo, fecha: fechaActual, hora: horaActual }]).select().single();
            if (error) throw error;
            
            showToast("¡Registro exitoso!", "success");
            displayLastVisitor(nuevoVisitante);
            cerrarModalRegistro();
            clearWorkInProgress();
        } catch (err) {
            showToast("Error al registrar los datos.", "error");
            console.error("Error de Supabase al insertar:", err);
        } finally {
            btnSubmitModal.disabled = false;
            btnSubmitModal.textContent = "Registrar";
        }
    });

    // --- 6. LÓGICA DEL LECTOR DE QR POR IMAGEN ---
    const handleImageFile = (file) => {
        if (!file) {
            qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
            imageResultBox.style.display = 'none';
            return;
        }
        
        qrFileNameDisplay.textContent = file.name;
        imageResultBox.textContent = 'Procesando...';
        imageResultBox.style.display = 'block';
        showToast("Procesando imagen...", "success");

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                qrCanvasElement.width = img.width;
                qrCanvasElement.height = img.height;
                qrCanvas.drawImage(img, 0, 0, img.width, img.height);
                const imageData = qrCanvas.getImageData(0, 0, qrCanvasElement.width, qrCanvasElement.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    const decodedData = new TextDecoder('utf-8').decode(new Uint8Array(code.binaryData));
                    imageResultBox.textContent = decodedData;
                    const parts = decodedData.split('|');
                    if (parts.length >= 3) {
                        const datos = { cedula: parts[0].trim(), nombre: parts[1].trim(), apellido: parts[2].trim() };
                        abrirModalRegistro(datos);
                    } else {
                        showToast("Formato del QR no esperado.", "error");
                    }
                } else {
                    imageResultBox.textContent = 'No se detectó ningún código QR en la imagen.';
                    showToast("No se encontró un QR en la imagen.", "error");
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    qrCaptureInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) handleImageFile(event.target.files[0]);
        event.target.value = '';
    });

    qrChooseInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) handleImageFile(event.target.files[0]);
        event.target.value = '';
    });

    // --- 7. LÓGICA PARA SCANBOT (Cámara en Vivo) ---
    if (btnScanLive) {
        btnScanLive.addEventListener('click', async () => {
            if (activeBarcodeScanner) return;
            showToast("Iniciando cámara...", "success");

            try {
                if (!scanbotSDK) {
                    scanbotSDK = await ScanbotSDK.initialize({
                        licenseKey: '',
                        enginePath: 'js/scanbot/'
                    });
                }
                const barcodeScannerConfig = {
                    containerId: 'scanner-container',
                    onBarcodesDetected: (result) => {
                        if (result.barcodes.length > 0) {
                            const textoQR = result.barcodes[0].text;
                            scanbotResultBox.textContent = textoQR;
                            scanbotResultBox.style.display = 'block';
                            
                            const parts = textoQR.split('|');
                            if (parts.length >= 3) {
                                const datos = { cedula: parts[0].trim(), nombre: parts[1].trim(), apellido: parts[2].trim() };
                                abrirModalRegistro(datos);
                            } else {
                                showToast("Formato del QR no esperado.", "error");
                            }

                            if (activeBarcodeScanner) {
                                activeBarcodeScanner.dispose();
                                activeBarcodeScanner = null;
                            }
                            const container = document.getElementById('scanner-container');
                            if (container) container.remove();
                        }
                    },
                    onError: (e) => {
                        console.error('Error del escáner:', e);
                        showToast('Error al escanear.', 'error');
                        if (activeBarcodeScanner) {
                            activeBarcodeScanner.dispose();
                            activeBarcodeScanner = null;
                        }
                    },
                    style: {
                        window: { backgroundColor: "rgba(0,0,0,0.7)" },
                        viewfinder: { borderColor: "white", borderWidth: 2, cornerRadius: 4 }
                    },
                    text: {
                        scanningHint: "Apunte al código QR de la cédula"
                    }
                };

                let scannerContainer = document.getElementById('scanner-container');
                if (!scannerContainer) {
                    scannerContainer = document.createElement('div');
                    scannerContainer.id = 'scanner-container';
                    scannerContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:1000;';
                    document.body.appendChild(scannerContainer);
                }
                scannerContainer.style.display = 'block';
                activeBarcodeScanner = await scanbotSDK.createBarcodeScanner(barcodeScannerConfig);

            } catch (e) {
                console.error('Error al inicializar Scanbot SDK:', e);
                showToast('No se pudo iniciar el escáner.', 'error');
            }
        });
    }

    // --- 8. INICIALIZACIÓN FINAL ---
    fetchLastVisitor();
    mainFormInputs.forEach(input => {
        input.addEventListener('input', updateWorkInProgress);
    });
    window.addEventListener('beforeunload', (event) => {
        if (window.isWorkInProgress) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
});