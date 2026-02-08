# Plataforma de Retos ANEIAP

Sistema de gestión de retos y evidencias para ANEIAP - Capítulo UNIGUAJIRA

## 🎨 Paleta de Colores

Este proyecto utiliza la paleta de colores oficial:

- **Verde Primavera** (#296945): Color primario
- **Verde Esperanza** (#39BAA2): Color secundario
- **Amarillo Desierto** (#F2A841): Color de acento
- **Azul Mar** (#00C0C7): Color complementario
- **Rosado Flamingo** (#F16362): Color de peligro/alertas

## 📁 Estructura del Proyecto

```
plataforma-retos-aneiap/
│
├── index.html          # Interfaz de usuario (frontend)
├── app.js             # Lógica del frontend
├── Code.gs            # Backend en Google Apps Script
└── README.md          # Este archivo
```

## 🚀 Instalación y Configuración

### Paso 1: Configurar el Backend (Google Apps Script)

1. Ve a [Google Apps Script](https://script.google.com/)
2. Crea un nuevo proyecto
3. Copia el contenido del archivo `Code.gs` (que ya tienes)
4. Actualiza la variable `SPREADSHEET_ID` con el ID de tu Google Spreadsheet
5. Actualiza la variable `CALENDAR_ID` si usas un calendario diferente
6. Ejecuta la función `inicializarSistema()` para crear las hojas necesarias
7. **Despliega como Web App:**
   - Click en "Desplegar" → "Nueva implementación"
   - Tipo: "Aplicación web"
   - Ejecutar como: "Yo"
   - Quién tiene acceso: "Cualquier usuario" (o según tus necesidades)
   - Click en "Implementar"
   - **Copia la URL del Web App** (la necesitarás en el paso siguiente)

### Paso 2: Configurar el Frontend

1. Abre el archivo `app.js`
2. Busca la línea que dice:
   ```javascript
   const GOOGLE_APPS_SCRIPT_URL = 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI';
   ```
3. Reemplaza `'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI'` con la URL que copiaste en el Paso 1

### Paso 3: Actualizar el Backend para Recibir Peticiones

Agrega esta función al final de tu archivo `Code.gs`:

```javascript
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const funcion = datos.funcion;
    const parametros = datos.parametros;
    
    let resultado;
    
    switch(funcion) {
      case 'loginUsuario':
        resultado = loginUsuario(parametros[0], parametros[1]);
        break;
      case 'cambiarPassword':
        resultado = cambiarPassword(parametros[0], parametros[1], parametros[2]);
        break;
      case 'getDirecciones':
        resultado = getDirecciones();
        break;
      case 'getRetosDireccion':
        resultado = getRetosDireccion(parametros[0]);
        break;
      case 'getRetosDisponiblesParaAsociado':
        resultado = getRetosDisponiblesParaAsociado(parametros[0], parametros[1]);
        break;
      case 'getTodosLosRetos':
        resultado = getTodosLosRetos();
        break;
      case 'crearReto':
        resultado = crearReto(parametros[0]);
        break;
      case 'actualizarReto':
        resultado = actualizarReto(parametros[0]);
        break;
      case 'desactivarReto':
        resultado = desactivarReto(parametros[0]);
        break;
      case 'subirEvidencia':
        resultado = subirEvidencia(parametros[0]);
        break;
      case 'getMisEvidencias':
        resultado = getMisEvidencias(parametros[0]);
        break;
      case 'getEvidenciasPendientes':
        resultado = getEvidenciasPendientes(parametros[0]);
        break;
      case 'getTodasLasEvidenciasPendientes':
        resultado = getTodasLasEvidenciasPendientes();
        break;
      case 'getTodasLasEvidencias':
        resultado = getTodasLasEvidencias();
        break;
      case 'validarEvidencia':
        resultado = validarEvidencia(parametros[0], parametros[1], parametros[2]);
        break;
      case 'getRankingGeneral':
        resultado = getRankingGeneral();
        break;
      case 'getRankingPorDireccion':
        resultado = getRankingPorDireccion(parametros[0], parametros[1]);
        break;
      case 'getRankingDirecciones':
        resultado = getRankingDirecciones(parametros[0]);
        break;
      case 'getEstadisticasGenerales':
        resultado = getEstadisticasGenerales();
        break;
      default:
        resultado = { success: false, message: 'Función no encontrada' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

**IMPORTANTE:** Después de agregar esta función, debes volver a desplegar el Web App:
- Ve a "Desplegar" → "Administrar implementaciones"
- Click en el ícono de edición (lápiz)
- En "Nueva versión", selecciona "Nueva versión"
- Click en "Implementar"

### Paso 4: Subir a GitHub

1. Crea un nuevo repositorio en GitHub
2. Sube los archivos:
   - `index.html`
   - `app.js`
   - `README.md`
3. Ve a la configuración del repositorio → Pages
4. Selecciona la rama `main` (o `master`) como fuente
5. GitHub te dará una URL donde estará alojado tu sitio

## 🔧 Configuración Inicial de Datos

### Crear Direcciones

Abre tu Google Spreadsheet y en la hoja "Direcciones" agrega:

| ID | NombreDireccion | Color | Descripcion |
|----|----------------|-------|-------------|
| 1  | Dirección 1    | #39BAA2 | Descripción de la dirección |
| 2  | Dirección 2    | #296945 | Descripción de la dirección |

### Crear Usuarios

En la hoja "Asociados" agrega:

| ID | Nombre | Documento | Direccion | Email | Rol | Estado | Password | RequiereCambioPassword |
|----|--------|-----------|-----------|-------|-----|--------|----------|----------------------|
| 1  | Usuario Test | 12345 | Dirección 1 | test@aneiap.co | Asociado | Activo | test123 | TRUE |

**Roles disponibles:**
- Asociado
- Director
- Presidente
- Admin
- Junta Directiva

## 📱 Uso del Sistema

1. Ingresa a la URL de GitHub Pages
2. Inicia sesión con tu correo institucional y contraseña
3. Si es tu primer ingreso, deberás cambiar tu contraseña
4. Navega por las diferentes secciones según tu rol

### Roles y Permisos

- **Asociado**: Ver retos disponibles, subir evidencias, ver ranking
- **Director**: Validar evidencias de su dirección, gestionar retos de su dirección
- **Presidente**: Crear retos globales, validar todas las evidencias
- **Admin**: Ver todas las estadísticas y datos del sistema

## 🎨 Personalización de Colores

Los colores se configuran en el archivo `index.html` dentro de la sección `:root` del CSS:

```css
:root {
  --primary: #296945;      /* Verde Primavera */
  --secondary: #39BAA2;    /* Verde Esperanza */
  --accent: #F2A841;       /* Amarillo Desierto */
  --azul-mar: #00C0C7;     /* Azul Mar */
  --rosado: #F16362;       /* Rosado Flamingo */
  /* ... */
}
```

## 🐛 Solución de Problemas

### El sistema no carga
1. Verifica que hayas configurado correctamente la URL en `app.js`
2. Asegúrate de que el Web App esté desplegado y accesible
3. Revisa la consola del navegador (F12) para ver errores

### No puedo iniciar sesión
1. Verifica que el usuario exista en la hoja "Asociados"
2. Asegura que el estado sea "Activo"
3. Confirma que la contraseña sea correcta

### Los datos no se cargan
1. Verifica que hayas ejecutado `inicializarSistema()`
2. Asegúrate de que el SPREADSHEET_ID sea correcto
3. Revisa los permisos del Google Spreadsheet

## 📞 Soporte

Para ayuda adicional, contacta al administrador del sistema.

## 📄 Licencia

Este proyecto es de uso interno de ANEIAP - Capítulo ICESI.

---

**ANEIAP - Capítulo ICESI - 2025**
