// js/script.js

// --- 0. INITIAL ROUTE PROTECTION ---
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

    // --- 1. DOM ELEMENTS ---
    const mainForm = document.getElementById('registro-form');
    const mainFormInputs = mainForm.querySelectorAll('input[type="text"], select');
    
    // Image QR elements
    const qrCaptureInput = document.getElementById('qr-captura');
    const qrChooseInput = document.getElementById('qr-elegir');
    const qrFileNameDisplay = document.getElementById('qr-file-name');
    const imageResultBox = document.getElementById('image-result-box');
    const qrCanvasElement = document.getElementById("qr-canvas");
    const qrCanvas = qrCanvasElement.getContext("2d");

    // Live scanner (Scanbot) elements
    const btnScanLive = document.getElementById('btn-scan-live');
    const scanbotResultBox = document.getElementById('scanbot-result-box');

    // Modal elements
    const modalRegistro = document.getElementById('modal-registro-qr');
    const modalForm = document.getElementById('modal-form-registro');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-registro');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal-registro');
    const btnSubmitModal = document.getElementById('btn-submit-modal-registro');

    // Other elements
    const toastEl = document.getElementById('toast-notification');
    const toastMessageEl = document.getElementById('toast-message');
    const ultimoVisitanteCard = document.getElementById('ultimo-visitante-card');

    // --- 2. STATE & PERSISTENCE ---
    let toastTimeout;
    let scanbotSDK;
    let activeBarcodeScanner;

    // --- 3. HELPER FUNCTIONS ---
    function showToast(message, type = 'success') {
        clearTimeout(toastTimeout);
        toastMessageEl.textContent = message;
        toastEl.className = `toast show ${type}`;
        toastTimeout = setTimeout(() => {
            toastEl.className = toastEl.className.replace('show', '');
        }, 3000);
    }
    
    window.clearWorkInProgress = () => {
        window.isWorkInProgress = false;
        mainForm.reset();
        modalForm.reset();
        qrFileNameDisplay.textContent = 'Ningún archivo seleccionado';
        if (imageResultBox) imageResultBox.style.display = 'none';
        if (scanbotResultBox) scanbotResultBox.style.display = 'none';
    };

    function updateWorkInProgress() {
        const hasContent = Array.from(mainFormInputs).some(input => input.value.trim() !== '');
        window.isWorkInProgress = hasContent;
    }
    
    function displayLastVisitor(visitor) {
       if (visitor) {
            document.getElementById('ultimo-nombre').textContent = visitor.nombre;
            document.getElementById('ultimo-apellido').textContent = visitor.apellido;
            document.getElementById('ultimo-cedula').textContent = visitor.cedula;
            // 🔥 UPDATE: Display the sex field on the card if it exists in your HTML
            // const sexoSpan = document.getElementById('ultimo-sexo'); 
            // if (sexoSpan) sexoSpan.textContent = visitor.sexo;
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
            console.error("Error fetching last visitor:", error);
            ultimoVisitanteCard.innerHTML = '<h4>No se pudo cargar el último registro.</h4>';
        }
    }

    // --- 4. MAIN FORM LOGIC (MANUAL) ---
    mainForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const cedula = document.getElementById("cedula").value.trim();
        const sexo = document.getElementById("sexo").value; // 🔥 Get sex value
        const motivo = document.getElementById("motivo").value.trim();

        if (!nombre || !apellido || !cedula || !sexo || !motivo) { // 🔥 Added sex validation
            showToast("Por favor, completa todos los campos.", "error");
            return;
        }
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando...";
        try {
            const fechaActual = new Date().toISOString().split("T")[0];
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const { data: nuevoVisitante, error } = await supabaseClient.from('visitantes').insert([{ nombre, apellido, cedula, sexo, motivo, fecha: fechaActual, hora: horaActual }]).select().single(); // 🔥 Added sex to insert
            if (error) throw error;
            
            showToast("¡Registro exitoso!", "success");
            displayLastVisitor(nuevoVisitante);
            clearWorkInProgress();
        } catch (err) {
            showToast("Error al registrar los datos.", "error");
            console.error("Supabase insert error:", err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrar Manualmente";
        }
    });

    // --- 5. REGISTRATION MODAL LOGIC ---
    function abrirModalRegistro(datos) {
        document.getElementById('modal-nombre').value = datos.nombre || '';
        document.getElementById('modal-apellido').value = datos.apellido || '';
        document.getElementById('modal-cedula').value = datos.cedula || '';
        document.getElementById('modal-sexo').value = datos.sexo || ''; // 🔥 Set sex value
        document.getElementById('modal-motivo').value = '';
        document.getElementById('modal-motivo').focus();
        modalRegistro.classList.add('visible');
    }

    function cerrarModalRegistro() {
        modalRegistro.classList.remove('visible');
    }

    btnCerrarModal.addEventListener('click', cerrarModalRegistro);
    btnCancelarModal.addEventListener('click', cerrarModalRegistro);

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById("modal-nombre").value.trim();
        const apellido = document.getElementById("modal-apellido").value.trim();
        const cedula = document.getElementById("modal-cedula").value.trim();
        const sexo = document.getElementById("modal-sexo").value; // 🔥 Get sex value
        const motivo = document.getElementById("modal-motivo").value.trim();

        if (!nombre || !apellido || !cedula || !sexo || !motivo) { // 🔥 Added sex validation
            showToast("Por favor, completa el motivo de la visita.", "error");
            return;
        }
        
        btnSubmitModal.disabled = true;
        btnSubmitModal.textContent = "Registrando...";

        try {
            const fechaActual = new Date().toISOString().split("T")[0];
            const horaActual = new Date().toLocaleTimeString("es-PA", { hour12: false });
            const { data: nuevoVisitante, error } = await supabaseClient.from('visitantes').insert([{ nombre, apellido, cedula, sexo, motivo, fecha: fechaActual, hora: horaActual }]).select().single(); // 🔥 Added sex to insert
            if (error) throw error;
            
            showToast("¡Registro exitoso!", "success");
            displayLastVisitor(nuevoVisitante);
            cerrarModalRegistro();
            clearWorkInProgress();
        } catch (err) {
            showToast("Error al registrar los datos.", "error");
            console.error("Supabase insert error:", err);
        } finally {
            btnSubmitModal.disabled = false;
            btnSubmitModal.textContent = "Registrar";
        }
    });

    // --- 6. IMAGE QR READER LOGIC ---
    const handleImageFile = (file) => {
        // ... (code inside is the same)
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // ... (image processing code is the same)
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    const decodedData = new TextDecoder('utf-8').decode(new Uint8Array(code.binaryData));
                    imageResultBox.textContent = decodedData;
                    const parts = decodedData.split('|');
                    // 🔥 UPDATED to check for at least 5 parts to get the sex
                    if (parts.length >= 5) {
                        const sexoChar = parts[4].trim().toUpperCase();
                        const sexo = sexoChar === 'M' ? 'Masculino' : (sexoChar === 'F' ? 'Femenino' : '');
                        const datos = { 
                            cedula: parts[0].trim(), 
                            nombre: parts[1].trim(), 
                            apellido: parts[2].trim(),
                            sexo: sexo
                        };
                        abrirModalRegistro(datos);
                    } else {
                        showToast("Formato del QR no esperado.", "error");
                    }
                } else {
                    // ... (error handling)
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

    // --- 7. SCANBOT LOGIC (LIVE CAMERA) ---
    if (btnScanLive) {
        btnScanLive.addEventListener('click', async () => {
            // ... (initialization code is the same)
            try {
                // ... (SDK initialization is the same)
                const barcodeScannerConfig = {
                    containerId: 'scanner-container',
                    onBarcodesDetected: (result) => {
                        if (result.barcodes.length > 0) {
                            const textoQR = result.barcodes[0].text;
                            scanbotResultBox.textContent = textoQR;
                            scanbotResultBox.style.display = 'block';
                            
                            const parts = textoQR.split('|');
                            // 🔥 UPDATED to check for at least 5 parts to get the sex
                            if (parts.length >= 5) {
                                const sexoChar = parts[4].trim().toUpperCase();
                                const sexo = sexoChar === 'M' ? 'Masculino' : (sexoChar === 'F' ? 'Femenino' : '');
                                const datos = { 
                                    cedula: parts[0].trim(), 
                                    nombre: parts[1].trim(), 
                                    apellido: parts[2].trim(),
                                    sexo: sexo
                                };
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
                        // ... (error handling is the same)
                    },
                    style: { /* ... */ },
                    text: { /* ... */ }
                };
                // ... (scanner creation code is the same)
                activeBarcodeScanner = await scanbotSDK.createBarcodeScanner(barcodeScannerConfig);

            } catch (e) {
                // ... (error handling is the same)
            }
        });
    }

    // --- 8. FINAL INITIALIZATION ---
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