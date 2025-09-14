// Contenido completo y corregido para js/test-scanner.js

console.log("✅ Archivo test-scanner.js CARGADO");

document.addEventListener('DOMContentLoaded', () => {
    
    console.log("🚀 DOM listo. Buscando elementos...");
    
    // --- Referencias a los elementos del DOM ---
    const qrResultDisplay = document.getElementById('qr-result-display');
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const btnScanLive = document.getElementById('btn-scan-live'); 
    let scanbotSDK;

    // Se imprime en consola el estado del botón para depurar
    console.log("Buscando el botón #btn-scan-live:", btnScanLive);

    // --- Funciones Auxiliares ---
    function showToast(message, type = 'success') {
        let toastTimeout;
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }
    
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

    // --- Lógica de Scanbot ---
    // Se verifica que el botón exista antes de asignarle un evento
    if (btnScanLive) {
        console.log("✔️ Botón encontrado. Añadiendo evento 'click'...");
        btnScanLive.addEventListener('click', async () => {
            showToast("Iniciando cámara...", "success");

            try {
                if (!scanbotSDK) {
                    scanbotSDK = await ScanbotSDK.initialize({
                        licenseKey: '', // Pega tu licencia de prueba de 7 días aquí
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
    } else {
        console.error("❌ ¡ERROR CRÍTICO! No se encontró el botón con id='btn-scan-live' en el HTML.");
    }

    // --- CÓDIGO FINAL PARA MOSTRAR LA PÁGINA ---
    // Oculta la pantalla de carga y muestra el contenido principal
    document.getElementById('loader').style.display = 'none';
    document.getElementById('main-content').style.display = 'flex';
    console.log("✨ Página lista y visible.");
});