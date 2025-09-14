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
    const inputs = form.querySelectorAll('input[type="text"]');
    const submitBtn = document.getElementById('submit-btn');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');
    
    // Inputs para carga de imagen
    const qrCaptureInput = document.getElementById('qr-captura');
    const qrChooseInput = document.getElementById('qr-elegir');

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

    // --- 4. LÓGICA DEL FORMULARIO DE REGISTRO ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        // ... (Tu código de envío de formulario no ha cambiado)
    });

    // --- 5. LÓGICA DEL LECTOR DE QR POR IMAGEN (AHORA UNA FUNCIÓN REUTILIZABLE) ---
    const handleImageFile = (file) => {
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
    };

    qrCaptureInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            handleImageFile(event.target.files[0]);
        }
        event.target.value = ''; // Resetea el input
    });

    qrChooseInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            handleImageFile(event.target.files[0]);
        }
        event.target.value = ''; // Resetea el input
    });

    // --- 6. INICIALIZACIÓN Y GUARDIANES ---
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
    // --- LÓGICA PARA SCANBOT (Método de Cámara en Vivo) ---
    // ==========================================================
    
    const btnScanLive = document.getElementById('btn-scan-live'); 
    let scanbotSDK;
    let activeBarcodeScanner; 

    function procesarDatosQRScanbot(textoQR) {
        qrResultDisplay.textContent = textoQR;
        const parts = textoQR.split('|');
        if (parts.length >= 3) {
            document.getElementById('cedula').value = parts[0].trim();
            document.getElementById('nombre').value = parts[1].trim();
            document.getElementById('apellido').value = parts[2].trim();
            showToast("Datos escaneados con éxito.", "success");
            updateWorkInProgress();
        } else {
            showToast("Formato del QR no esperado.", "error");
        }
    }

    if (btnScanLive) {
        btnScanLive.addEventListener('click', async () => {
            if (activeBarcodeScanner) {
                return;
            }
            showToast("Iniciando cámara...", "success");
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
                            if (activeBarcodeScanner) {
                                activeBarcodeScanner.dispose();
                                activeBarcodeScanner = null;
                            }
                            const container = document.getElementById('scanner-container');
                            if (container) {
                                container.remove();
                            }
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
});