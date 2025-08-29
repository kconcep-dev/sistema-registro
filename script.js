async function sendToBackend(nombre, apellido, cedula, motivo) {
  const fecha = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const hora = new Date().toLocaleTimeString("es-PA", { hour12: false }); // HH:mm:ss

  const supabaseUrl = "https://qmzbqwwndsdsmdkrimwb.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtemJxd3duZHNkc21ka3JpbXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTExNDYsImV4cCI6MjA3MjA2NzE0Nn0.dfQdvfFbgXdun1kQ10gRsqh3treJRzOKdbkebpEQXWo";

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
    alert("Registro exitoso");
    document.getElementById("registro-form").reset();
  } else {
    const error = await response.text();
    console.error("Error al registrar:", error);
    alert("Error al registrar: " + error);
  }
}