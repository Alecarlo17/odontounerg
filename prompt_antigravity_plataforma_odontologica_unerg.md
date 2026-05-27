# PROMPT PARA DESARROLLAR EL PROYECTO EN ANTIGRAVITY

## CONTEXTO GENERAL DEL PROYECTO

Necesito desarrollar una plataforma web sencilla, moderna y funcional para la búsqueda y gestión de pacientes odontológicos de la Universidad Nacional Experimental Rómulo Gallegos (UNERG).

El proyecto será utilizado como Proyecto de Grado II del área de informática, por lo tanto el sistema debe ser fácil de explicar y defender ante un jurado académico.

La plataforma debe tener una estructura clara, organizada y sencilla de entender, evitando complejidades innecesarias.

El objetivo principal del sistema es conectar estudiantes de odontología con pacientes que necesiten tratamientos odontológicos.

El sistema debe permitir:

- Registro de estudiantes.
- Registro de pacientes.
- Inicio de sesión.
- Creación de perfiles.
- Búsqueda de pacientes.
- Solicitudes entre estudiantes y pacientes.
- Sistema de citas.
- Chat básico entre estudiante y paciente.
- Panel administrativo simple.

La interfaz debe ser moderna, limpia, intuitiva y responsive.

---

# TECNOLOGÍAS A UTILIZAR

Quiero utilizar tecnologías sencillas y modernas que permitan un desarrollo fácil de comprender.

## Frontend

- HTML
- CSS
- JavaScript

## Backend

- Supabase como backend principal.
- Supabase Authentication para autenticación.
- Supabase Database para base de datos.
- Supabase Realtime para chat.

## Despliegue

- Vercel para el frontend.

NO utilizar arquitecturas complejas.
NO utilizar microservicios.
NO utilizar configuraciones avanzadas difíciles de defender.

El proyecto debe mantenerse simple y académico.

---

# ESTRUCTURA GENERAL DEL SISTEMA

La plataforma tendrá 3 tipos de usuarios:

1. Administrador
2. Estudiante
3. Paciente

---

# FUNCIONALIDADES DEL SISTEMA

## 1. AUTENTICACIÓN

El sistema debe permitir:

- Registro de estudiantes.
- Registro de pacientes.
- Inicio de sesión.
- Recuperación de contraseña.
- Cierre de sesión.

Durante el registro:

### Estudiantes

Deben ingresar:

- Nombre completo.
- Cédula.
- Correo electrónico.
- Contraseña.
- Sección.
- Año académico.
- Foto de perfil opcional.

NO colocar selección de universidad.
La universidad será únicamente UNERG.

### Pacientes

Deben ingresar:

- Nombre completo.
- Cédula.
- Edad.
- Teléfono.
- Correo electrónico.
- Contraseña.
- Dirección.
- Antecedentes médicos.
- Problema odontológico principal.
- Foto opcional.

El problema odontológico debe poder seleccionarse desde una lista.

Ejemplos:

- Ortodoncia.
- Extracción.
- Limpieza dental.
- Caries.
- Endodoncia.
- Prótesis.
- Otro.

---

# 2. DASHBOARD DEL ESTUDIANTE

El estudiante debe tener un panel principal donde pueda:

- Ver pacientes disponibles.
- Filtrar pacientes por tratamiento.
- Ver información básica del paciente.
- Enviar solicitud al paciente.
- Ver solicitudes aceptadas.
- Ver citas.
- Acceder al chat.

IMPORTANTE:

El estudiante NO registra pacientes.
El estudiante solamente selecciona pacientes disponibles.

---

# 3. DASHBOARD DEL PACIENTE

El paciente debe poder:

- Crear su perfil.
- Publicar su necesidad odontológica.
- Ver solicitudes recibidas.
- Aceptar o rechazar estudiantes.
- Ver citas programadas.
- Acceder al chat.
- Editar perfil.

---

# 4. SISTEMA DE SOLICITUDES

El flujo debe ser:

1. El estudiante visualiza pacientes.
2. El estudiante envía solicitud.
3. El paciente recibe la solicitud.
4. El paciente acepta o rechaza.
5. Si acepta:
   - Se crea una relación estudiante-paciente.
   - Se habilita el chat.
   - Se habilita el módulo de citas.

También permitir que:

- El paciente pueda enviar solicitud a un estudiante.

---

# 5. SISTEMA DE CHAT

Crear un chat sencillo en tiempo real usando Supabase Realtime.

El chat debe permitir:

- Enviar mensajes.
- Recibir mensajes.
- Ver conversaciones.
- Mostrar fecha y hora.

NO hacer un chat complejo.
Debe ser sencillo y fácil de defender académicamente.

---

# 6. SISTEMA DE CITAS

Crear un módulo de citas simple.

Debe permitir:

- Registrar citas.
- Mostrar fecha.
- Mostrar hora.
- Mostrar paciente.
- Mostrar estudiante.
- Estado de cita:
  - Pendiente.
  - Confirmada.
  - Finalizada.

Las citas deben aparecer únicamente cuando exista aceptación entre estudiante y paciente.

---

# 7. PANEL ADMINISTRATIVO

El administrador debe poder:

- Ver usuarios registrados.
- Ver pacientes.
- Ver estudiantes.
- Eliminar registros.
- Supervisar solicitudes.
- Supervisar citas.

NO hacer estadísticas avanzadas.
Mantenerlo simple.

---

# DISEÑO VISUAL

El diseño debe ser:

- Minimalista.
- Moderno.
- Profesional.
- Responsive.
- Fácil de usar.

Usar:

- CSS tradicional.
- Cards.
- Sidebar.
- Navbar sencilla.
- Formularios organizados.

La interfaz debe ser clara para poder explicarla fácilmente en la defensa.

---

# BASE DE DATOS

Crear tablas simples y bien organizadas.

## Tablas principales:

### users

- id
- nombre
- correo
- contraseña
- rol
- foto
- created_at

### students

- id
- user_id
- cedula
- seccion
- ano_academico

### patients

- id
- user_id
- edad
- telefono
- direccion
- antecedentes_medicos
- problema_odontologico

### requests

- id
- student_id
- patient_id
- estado
- created_at

### chats

- id
- sender_id
- receiver_id
- mensaje
- created_at

### appointments

- id
- student_id
- patient_id
- fecha
- hora
- estado

---

# REQUERIMIENTOS IMPORTANTES

- Utilizar JavaScript puro.
- Mantener código organizado.
- Utilizar archivos separados para HTML, CSS y JavaScript.
- Mantener estructura sencilla.
- Explicar el código mediante comentarios.
- Evitar lógica complicada.
- Mantener nombres claros.
- Utilizar Supabase para autenticación y base de datos.

---

# OBJETIVO ACADÉMICO

Este sistema será defendido ante un jurado universitario.

Por lo tanto:

- El proyecto debe verse profesional.
- Debe ser fácil de explicar.
- Debe tener una estructura clara.
- Debe evitar complejidad innecesaria.
- Debe funcionar correctamente.

El enfoque principal debe ser:

“Sistema sencillo, funcional, moderno y fácil de defender académicamente.”

---

# FUNCIONALIDADES AVANZADAS Y COMPLEMENTARIAS

## SISTEMA DE CALIFICACIONES

Después de finalizar una atención odontológica, el paciente podrá calificar al estudiante mediante un sistema simple de puntuación y comentarios.

El sistema debe permitir:

- Calificación mediante estrellas.
- Comentarios opcionales.
- Visualización de reputación del estudiante.

---

## HISTORIAL DE TRATAMIENTOS

Cada paciente debe contar con un historial básico de tratamientos odontológicos.

El historial debe incluir:

- Tratamiento realizado.
- Fecha.
- Estado del tratamiento.
- Observaciones.
- Estudiante responsable.

Estados posibles:

- Pendiente.
- En proceso.
- Finalizado.

---

## SUBIDA DE IMÁGENES

La plataforma debe permitir subir imágenes relacionadas con tratamientos odontológicos.

Ejemplos:

- Fotografías dentales.
- Radiografías simples.
- Imágenes de seguimiento.

Utilizar Supabase Storage para almacenamiento.

---

## SISTEMA DE DISPONIBILIDAD

Los usuarios podrán indicar su disponibilidad dentro de la plataforma.

Estados:

- Disponible.
- Ocupado.
- No disponible.

---

## DASHBOARD CON ESTADÍSTICAS

El dashboard debe mostrar estadísticas simples y fáciles de entender.

Ejemplos:

- Cantidad de pacientes.
- Solicitudes activas.
- Citas pendientes.
- Tratamientos finalizados.

Las estadísticas deben mostrarse mediante tarjetas visuales.

---

## RECORDATORIOS DE CITAS

El sistema debe mostrar recordatorios simples relacionados con las citas.

Ejemplos:

- Cita programada para mañana.
- Cita pendiente.
- Cita confirmada.

---

## PERFIL PÚBLICO DEL ESTUDIANTE

Cada estudiante tendrá un perfil público dentro de la plataforma.

Debe mostrar:

- Foto.
- Nombre.
- Sección.
- Año académico.
- Tratamientos de interés.
- Estado de disponibilidad.
- Calificaciones recibidas.

Esto permitirá que los pacientes puedan seleccionar estudiantes de forma más organizada.

---

## GENERACIÓN DE REPORTES

El sistema debe permitir generar reportes simples en formato PDF.

Ejemplos:

- Lista de citas.
- Pacientes asignados.
- Historial de tratamientos.

Los reportes deben tener formato sencillo y académico.

---

# FUNCIONALIDADES ADICIONALES IMPORTA

## PERFIL DE PACIENTE

El perfil del paciente debe incluir:

- Foto de perfil.
- Información personal.
- Edad.
- Teléfono.
- Dirección.
- Antecedentes médicos.
- Problema odontológico.
- Estado de disponibilidad.
- Historial de solicitudes.

Los pacientes podrán editar su información en cualquier momento.

---

## PERFIL DEL ESTUDIANTE

El perfil del estudiante debe incluir:

- Foto de perfil.
- Nombre completo.
- Cédula.
- Sección.
- Año académico.
- Especialidad o tratamiento de interés.
- Estado de disponibilidad.

---

# FILTROS DE BÚSQUEDA

El dashboard de estudiantes debe permitir:

- Buscar pacientes por tratamiento.
- Buscar pacientes por edad.
- Buscar pacientes por disponibilidad.
- Filtrar pacientes recientes.
- Mostrar pacientes disponibles en tarjetas visuales.

---

# SISTEMA DE ESTADOS

Las solicitudes deben manejar estados:

- Pendiente.
- Aceptada.
- Rechazada.
- Finalizada.

Las citas también deben manejar estados:

- Pendiente.
- Confirmada.
- Finalizada.
- Cancelada.

---

# NOTIFICACIONES

El sistema debe incluir notificaciones simples para:

- Nueva solicitud recibida.
- Solicitud aceptada.
- Solicitud rechazada.
- Nuevo mensaje.
- Nueva cita.
- Recordatorio de cita.

Las notificaciones pueden mostrarse dentro del dashboard.

---

# PANEL PRINCIPAL

Cada usuario debe visualizar un panel principal organizado.

## Panel del Estudiante

Debe mostrar:

- Pacientes disponibles.
- Solicitudes pendientes.
- Pacientes aceptados.
- Próximas citas.
- Acceso rápido al chat.

## Panel del Paciente

Debe mostrar:

- Estado de solicitudes.
- Estudiantes disponibles.
- Próximas citas.
- Acceso al chat.
- Información de tratamiento.

---

# SEGURIDAD

Implementar medidas básicas de seguridad:

- Validación de formularios.
- Protección de rutas privadas.
- Autenticación mediante Supabase.
- Restricción de acceso según roles.
- Protección de sesiones.

---

# EXPERIENCIA DE USUARIO

La plataforma debe:

- Ser rápida.
- Tener navegación sencilla.
- Mostrar mensajes claros.
- Tener formularios fáciles de completar.
- Ser adaptable a teléfonos y computadoras.

---

# ORGANIZACIÓN DEL PROYECTO

El proyecto debe organizarse en carpetas simples:

- /html
- /css
- /js
- /assets
- /components

Mantener nombres claros y fáciles de entender.

---

# REQUERIMIENTOS VISUALES

El sistema debe utilizar:

- Diseño limpio.
- Colores suaves.
- Tipografía moderna.
- Formularios centrados.
- Tarjetas organizadas.
- Sidebar sencilla.
- Dashboard visual.

NO utilizar diseños excesivamente complejos.

---

# OBJETIVO PRINCIPAL DEL SISTEMA

El objetivo principal es crear una plataforma web académica sencilla que permita mejorar la conexión entre estudiantes de odontología y pacientes, facilitando la organización de citas, solicitudes y comunicación dentro de un entorno digital moderno y accesible.

---

# RESULTADO ESPERADO

Generar:

- Frontend completo.
- Integración con Supabase.
- Sistema de autenticación.
- Dashboard por roles.
- Sistema de solicitudes.
- Chat básico en tiempo real.
- Sistema de citas.
- Panel administrativo.
- Diseño responsive.
- Validaciones básicas.
- Notificaciones simples.
- Organización clara del código.

El sistema debe verse profesional, funcional y fácil de defender académicamente.

