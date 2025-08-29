document.getElementById("registro-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const apellido = document.getElementById("apellido").value;
  const cedula = document.getElementById("cedula").value;
  const motivo = document.getElementById("motivo").value;

  const formData = new URLSearchParams();
  formData.append("nombre", nombre);
  formData.append("apellido", apellido);
  formData.append("cedula", cedula);
  formData.append("motivo", motivo);

  fetch("https://script.google.com/macros/s/AKfycbzlooyMoHLkMYx0zdSSZ1LhEEF_2oAAa61774bbxYT_MGO1C2ggbVWlVwQsH7u24-jxag/exec", {
    method: "POST",
    body: formData
  })
  .then(response => response.text())
  .then(data => {
    console.log("Respuesta del servidor:", data);
    alert("Registro exitoso");
    document.getElementById("registro-form").reset();
  })
  .catch(error => {
    console.error("Error al registrar:", error);
    alert("Error al registrar: " + error);
  });
});