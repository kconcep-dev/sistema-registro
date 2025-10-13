# Sistema de Registro - Soporte Técnico

<p align="center">
  <img src="assets/images/logo.png" alt="Logo del Sistema de Registro" width="180" />
  <img src="assets/images/meduca.png" alt="Logo del Ministerio de Educación" width="180" />
  <img src="assets/images/oteima.png" alt="Logo de la Universidad Tecnológica OTEIMA" width="180" />
</p>

## Tabla de contenidos
- [Descripción general](#descripción-general)
- [Módulos funcionales](#módulos-funcionales)
  - [Autenticación y navegación](#autenticación-y-navegación)
  - [Registro de visitantes](#registro-de-visitantes)
  - [Gestión de descartes de equipos](#gestión-de-descartes-de-equipos)
  - [Inventario de activos tecnológicos](#inventario-de-activos-tecnológicos)
  - [Consultas integrales](#consultas-integrales)
- [Experiencia de usuario y accesibilidad](#experiencia-de-usuario-y-accesibilidad)
- [Tecnologías clave](#tecnologías-clave)
- [Despliegue y configuración](#despliegue-y-configuración)
- [Contexto institucional](#contexto-institucional)
- [Autor y contacto](#autor-y-contacto)

## Descripción general
El **Sistema de Registro - Soporte Técnico** es una plataforma web integral que digitaliza los procesos de recepción de visitas y control de activos tecnológicos en un entorno administrativo. La solución reemplaza los flujos manuales basados en papel mediante formularios inteligentes, flujos de trabajo guiados y reportes automatizados. La versión actual incorpora las mejoras finales desarrolladas durante el proyecto, incluyendo gestión avanzada de descartes, inventario centralizado y herramientas de auditoría para sesiones históricas.

## Módulos funcionales

### Autenticación y navegación
- Control de acceso mediante Supabase Auth con gestión de sesión inactiva y cierre manual.
- Barra de navegación dinámica compartida por todas las vistas, sincronizada con el estado de autenticación.
- Página de inicio que actúa como tablero para acceder rápidamente a los módulos operativos.

### Registro de visitantes
- Formulario responsivo con validaciones en tiempo real para capturar datos personales y motivo de visita.
- Integración del **Scanbot SDK** para escanear códigos QR de cédulas panameñas, con opción de cargar imágenes desde cámara o galería en caso de contingencias.
- Reproducción de alertas auditivas y visuales que confirman registros exitosos y previenen errores de captura.
- Tarjeta informativa que resume el último visitante registrado, facilitando la verificación inmediata.

### Gestión de descartes de equipos
- Creación de sesiones de descarte por unidad administrativa con seguimiento automático del identificador activo.
- Formularios con campos especializados para describir cada equipo (inventario, serie, marca, estado y motivo de descarte).
- Persistencia del estado en recargas del navegador y mecanismo "Guardián" que impide abandonar la página con cambios sin guardar.
- Escáner integrado para códigos de barras y QR que agiliza el registro de marbetes.
- Exportación a Excel con plantillas institucionales que incorporan automáticamente los logotipos oficiales y los datos consolidados de cada sesión.

### Inventario de activos tecnológicos
- Panel dedicado para gestionar equipos asignados, libres o en revisión, con tarjetas de indicadores globales.
- Filtros combinables por texto, estado operativo y departamento, además de controles rápidos para actualizar información.
- Modal de edición con validaciones específicas por campo y confirmaciones antes de operaciones sensibles.
- Generación de reportes en Excel directamente desde la vista, manteniendo formatos y combinaciones de celdas alineados a los lineamientos institucionales.

### Consultas integrales
- Tablero de doble pestaña que consolida registros de visitantes y sesiones de descarte en una sola interfaz.
- Búsquedas instantáneas por nombre, cédula, fecha o código SIACE, con filtros de rango de fechas y contadores en vivo.
- Edición, eliminación y exportación selectiva de registros mediante acciones contextualizadas en cada fila.
- Visualización detallada de cada sesión de descarte con metadatos ampliados y listado completo de los equipos asociados.

## Experiencia de usuario y accesibilidad
- Diseño responsivo optimizado para escritorios, tabletas y dispositivos móviles.
- Temas claro y oscuro persistentes, seleccionables por el usuario y sincronizados en todas las vistas.
- Componentes reutilizables con etiquetas accesibles, atajos en pantalla y mensajes ARIA para usuarios de lectores de pantalla.
- Sistema de notificaciones tipo *toast* que comunica estados sin interrumpir los flujos de trabajo.
- Protección ante pérdidas de datos mediante confirmaciones modales, auto-guardado contextual y restauración de sesiones activas.

## Tecnologías clave

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![ExcelJS](https://img.shields.io/badge/ExcelJS-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white)
![Scanbot](https://img.shields.io/badge/Scanbot%20SDK-FF2D55?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAQAAAC4GHSjAAAAKElEQVQYlWNgwA/8////bwYGBhaGKECTkJCICgGKqKurBqgGJpBmAABuVREHT5ItOgAAAABJRU5ErkJggg==&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)

* **Frontend:** HTML5, CSS3 y JavaScript (ES6+), componentes personalizados y control de estado en el navegador.
* **Backend y Base de Datos:** Supabase con políticas RLS para garantizar que cada operación respete los permisos definidos.
* **Automatización de reportes:** ExcelJS para generar libros con celdas combinadas, imágenes institucionales y formatos numéricos.
* **Escaneo avanzado:** Integración del SDK de Scanbot para dispositivos móviles y escritorios compatibles.
* **Hosting:** GitHub Pages, con despliegue continuo a partir del repositorio principal.

## Despliegue y configuración

### Requisitos previos
- Cuenta activa en [Supabase](https://supabase.com/).
- Navegador moderno compatible con ES6 y APIs de cámara.

### Pasos de instalación
1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/kconcep-dev/sistema-registro.git
   cd sistema-registro
   ```
2. **Configurar Supabase**
   - Crear las tablas `visitantes`, `descartes_sesiones`, `equipos_descartados`, `inventario_equipos` y las funciones auxiliares según el modelo de datos definido en la documentación interna.
   - Activar políticas **Row Level Security** para cada tabla y definir reglas de acceso según los roles autorizados.
   - Obtener la **URL del Proyecto** y la **Clave Pública (anon key)**.
3. **Preparar la configuración local**
   - Duplicar `js/config.example.js` como `js/config.js`.
   - Actualizar las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y demás parámetros requeridos.
4. **Ejecutar la aplicación**
   - Abrir `login.html` en el navegador o servir el proyecto con un servidor estático para replicar el entorno productivo.

### Buenas prácticas de seguridad
- Utilizar únicamente la clave pública `anon` en el front-end y mantener el resto de credenciales fuera del repositorio.
- Revisar periódicamente las políticas RLS y los logs de Supabase para detectar accesos no autorizados.
- Regenerar las claves desde Supabase ante cualquier sospecha de exposición.

## Contexto institucional
Este proyecto fue desarrollado como propuesta final para la práctica profesional de la Universidad Tecnológica OTEIMA (Panamá), alineado con los procesos del Ministerio de Educación. Su adopción busca fortalecer la trazabilidad de visitas y la administración del inventario tecnológico en las sedes atendidas por el equipo de soporte.

## Autor y contacto
**Kevin Concepción**

- GitHub: [@kconcep-dev](https://github.com/kconcep-dev)
- Correo electrónico: [concepcion.kelieser@gmail.com](mailto:concepcion.kelieser@gmail.com)

---

Se agradece el interés en este proyecto. Para consultas adicionales o solicitudes de colaboración, no dude en ponerse en contacto.
