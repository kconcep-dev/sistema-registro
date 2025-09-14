console.log("✅ Archivo test-scanner.js CARGADO");

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos que ya existen en tu HTML
    const qrResultDisplay = document.getElementById('qr-result-display');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');

    // (Opcional) Puedes copiar tus funciones showToast y updateWorkInProgress aquí
    // para que el feedback visual funcione en la página de prueba.
    function showToast(message, type = 'success') {
        let toastTimeout;
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }
    
    // --- CÓDIGO DE SCANBOT ---
    const btnScanLive = document.getElementById('btn-scan-live'); // Añade un botón con este id en test-scanner.html
    let scanbotSDK;

    function procesarDatosQR(textoQR) {
        qrResultDisplay.textContent = textoQR;
        const parts = textoQR.split('|');
        if (parts.length >= 3) {
            document.getElementById('cedula').value = parts[0].trim();
            document.getElementById('nombre').value = parts[1].trim();
            document.getElementById('apellido').value = parts[2].trim();
            showToast("Datos escaneados con éxito.", "success");
        } else {
            showToast("Formato del QR no esperado.", "error");
        }
    }

    btnScanLive.addEventListener('click', async () => {
        showToast("Iniciando cámara...", "success");

        try {
            if (!scanbotSDK) {
                scanbotSDK = await ScanbotSDK.initialize({
                    licenseKey: '', // Pega tu licencia de prueba aquí
                    engine: 'js/scanbot/'
                });
            }

            const barcodeScannerConfig = {
                containerId: 'scanner-container',
                onBarcodesDetected: (result) => {
                    if (result.barcodes.length > 0) {
                        procesarDatosQR(result.barcodes[0].text);
                        scanbotSDK.disposeBarcodeScanner();
                        document.getElementById('scanner-container').style.display = 'none';
                    }
                },
                onError: (e) => {
                    console.error('Error del escáner:', e);
                    showToast('Error al escanear.', 'error');
                },
            };

            let scannerContainer = document.getElementById('scanner-container');
            if (!scannerContainer) {
                scannerContainer = document.createElement('div');
                scannerContainer.id = 'scanner-container';
                scannerContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:1000; background: #000;';
                document.body.appendChild(scannerContainer);
            }
            scannerContainer.style.display = 'block';

            await scanbotSDK.createBarcodeScanner(barcodeScannerConfig);

        } catch (e) {
            console.error('Error al inicializar Scanbot SDK:', e);
            showToast('No se pudo iniciar el escáner.', 'error');
        }
    });
});