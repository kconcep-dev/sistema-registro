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

    // --- 1. ELEMENTOS DEL DOM (Tu código original) ---
    const form = document.getElementById('registro-form');
    const inputs = form.querySelectorAll('input[type="text"]');
    const submitBtn = document.getElementById('submit-btn');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');
    const qrFileInput = document.getElementById('qr-captura');
    const qrFileNameDisplay = document.getElementById('qr-file-name');
    const qrResultDisplay = document.getElementById('qr-result-display');
    const qrCanvasElement = document.getElementById("qr-canvas");
    const qrCanvas = qrCanvasElement.getContext("2d");

    // --- 2. ESTADO Y PERSISTENCIA (Tu código original) ---
    let toastTimeout;

    // --- 3. FUNCIONES AUXILIARES (Tu código original) ---
    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }

    function updateWorkInProgress() {
        const hasContent = Array.from(inputs).some(input => input.value.trim() !== '');
        window.isWorkInProgress = hasContent;
    }

    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        form.reset();
        qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
        qrResultDisplay.textContent = '';
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

    // --- 4. LÓGICA DEL FORMULARIO DE REGISTRO (Tu código original) ---
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

    // --- 5. LÓGICA DEL LECTOR DE QR (Tu código original) ---
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
                        updateWorkInProgress();
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

    // --- 6. INICIALIZACIÓN Y GUARDIANES (Tu código original) ---
    fetchLastVisitor();
    inputs.forEach(input => {
        input.addEventListener('input', updateWorkInProgress);
    });
    window.addEventListener('beforeunload', (event) => {
        if (window.isWorkInProgress) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    // ==========================================================
    // 🔥 --- NUEVO CÓDIGO PARA SCANBOT AÑADIDO AQUÍ --- 🔥
    // ==========================================================
    
    const btnScanLive = document.getElementById('btn-scan-live'); 
    let scanbotSDK;

    function procesarDatosQRScanbot(textoQR) {
        qrResultDisplay.textContent = textoQR;
        const parts = textoQR.split('|');
        if (parts.length >= 3) {
            document.getElementById('cedula').value = parts[0].trim();
            document.getElementById('nombre').value = parts[1].trim();
            document.getElementById('apellido').value = parts[2].trim();
            showToast("Datos escaneados con éxito (Nuevo).", "success");
            updateWorkInProgress();
        } else {
            showToast("Formato del QR no esperado (Nuevo).", "error");
        }
    }

    if (btnScanLive) {
        btnScanLive.addEventListener('click', async () => {
            showToast("Iniciando cámara (Nuevo)...", "success");

            try {
                if (!scanbotSDK) {
                    scanbotSDK = await ScanbotSDK.initialize({
                        licenseKey: '', // Pega tu licencia de prueba de 7 días aquí
                        enginePath: 'js/scanbot/'
                    });
                }

                const barcodeScannerConfig = {
                    containerId: 'scanner-container',
                    onBarcodesDetected: (result) => {
                        if (result.barcodes.length > 0) {
                            procesarDatosQRScanbot(result.barcodes[0].text);
                            scanbotSDK.disposeBarcodeScanner();
                            const container = document.getElementById('scanner-container');
                            if (container) {
                                container.remove();
                            }
                        }
                    },
                    onError: (e) => {
                        console.error('Error del escáner:', e);
                        showToast('Error al escanear.', 'error');
                    },
                    // Estilo del escáner
                    style: {
                        window: {
                            backgroundColor: "rgba(0,0,0,0.7)"
                        },
                        viewfinder: {
                            borderColor: "white",
                            borderWidth: 2,
                            cornerRadius: 4,
                        }
                    },
                    // Texto que aparece en la UI del escáner
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

                await scanbotSDK.createBarcodeScanner(barcodeScannerConfig);

            } catch (e) {
                console.error('Error al inicializar Scanbot SDK:', e);
                showToast('No se pudo iniciar el escáner.', 'error');
            }
        });
    }
});