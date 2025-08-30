// Función principal para enviar los datos a Supabase
async function sendToBackend(nombre, apellido, cedula, motivo) {
  const fecha = new Date().toISOString().split("T")[0];
  const hora = new Date().toLocaleTimeString("es-PA", { hour12: false });

  const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/visitantes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify([{
        nombre,
        apellido,
        cedula,
        motivo,
        fecha,
        hora
      }])
    });

    if (response.ok) {
      console.log("Registro exitoso");
      alert("Registro exitoso");
      document.getElementById("registro-form").reset();
    } else {
      const error = await response.text();
      console.error("Error al registrar:", error);
      alert("Error al registrar: " + error);
    }
  } catch (err) {
    console.error("Error de conexión:", err);
    alert("No se pudo conectar con el servidor.");
  }
}

// Conectar el formulario con la función
document.getElementById("registro-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const cedula = document.getElementById("cedula").value.trim();
  const motivo = document.getElementById("motivo").value.trim();

  if (nombre && apellido && cedula && motivo) {
    sendToBackend(nombre, apellido, cedula, motivo);
  } else {
    alert("Por favor, completa todos los campos.");
  }
});

// Procesar imagen capturada desde cámara
function extraerTextoDesdeCaptura() {
  const archivo = document.getElementById("cedula-captura").files[0];
  if (!archivo) return alert("Toma una foto de la cédula primero.");

  procesarImagenOCR(archivo);
}

// Procesar imagen subida desde galería
function extraerTextoDesdeArchivo() {
  const archivo = document.getElementById("cedula-img").files[0];
  if (!archivo) return alert("Selecciona una imagen desde tu galería.");

  procesarImagenOCR(archivo);
}

// Función OCR con Tesseract.js
function procesarImagenOCR(archivo) {
  Tesseract.recognize(archivo, 'spa', { logger: m => console.log(m) })
    .then(({ data: { text } }) => {
      // Mostrar el texto detectado en pantalla
      document.getElementById("resultado").innerText = text;

      // Reproducir sonido de confirmación
      document.getElementById("scan-sound").play();

      // Intentar detectar campos automáticamente
      const cedulaMatch = text.match(/\d{1,2}-\d{3,}-\d{4}/);
      if (cedulaMatch) {
        document.getElementById("cedula").value = cedulaMatch[0];
      }

      const nombreMatch = text.match(/[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,}/);
      if (nombreMatch) {
        const partes = nombreMatch[0].split(" ");
        document.getElementById("nombre").value = partes.slice(0, -1).join(" ");
        document.getElementById("apellido").value = partes.slice(-1).join(" ");
      }

      alert("Texto detectado. Revisa el área de resultado y ajusta los campos si es necesario.");
    })
    .catch(err => {
      console.error("Error al procesar imagen:", err);
      alert("No se pudo leer la imagen. Intenta con una foto más clara.");
    });
}

// Registrar el Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then(reg => console.log("Service Worker registrado"))
      .catch(err => console.error("Error al registrar Service Worker:", err));
  });
}