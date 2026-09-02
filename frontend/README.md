# Frontend — Panel del personal (Sistema de Fidelización)

Panel de administración/recepción del hotel, construido con **React + Vite**. Estado global con **Redux Toolkit**, peticiones con **axios**, rutas con **react-router-dom**, exportación a **PDF** (`jspdf`) y **CSV**, y **modo claro/oscuro**.

> El **build sale a `../backend/public`** (ver `vite.config.js`), así el panel viaja con el backend y se sirve desde el mismo dominio. Desplegar = `pnpm build` → commit → push a `main` (auto-deploy).

```bash
pnpm install
cp .env.example .env      # ajusta VITE_API_URL si hace falta
pnpm dev                  # Vite en http://localhost:5173
```

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (Vite). |
| `pnpm build` | Compila a `../backend/public`. |
| `pnpm preview` | Previsualiza el build. |
| `pnpm lint` | ESLint. |
| `pnpm test:e2e` | Pruebas end-to-end (Playwright). |

## Estructura

```
frontend/
├── index.html               Entrada de Vite
├── vite.config.js           Config de Vite (build → ../backend/public)
├── eslint.config.js         Reglas de ESLint
├── playwright.config.js      Config de las pruebas E2E
├── .env* (.env, .example,    Variables VITE_API_URL por entorno
│         .production, .e2e)
│
├── e2e/                      Pruebas end-to-end del panel (Playwright)
│   └── panel.spec.js
│
├── public/                  Estáticos servidos tal cual (favicon, imágenes de fondo)
│
└── src/
    ├── main.jsx             Bootstrap de React (Provider de Redux + Router)
    ├── Aplicacion.jsx       Definición de rutas y estructura de la app
    ├── index.css            Estilos globales
    ├── Logo/                Imagen del logo de marca
    │
    ├── api/
    │   └── api.js           Instancia de axios: baseURL, token y manejo de 401
    │
    ├── componentes/         Componentes reutilizables
    │   ├── ErrorBoundary/   Captura de errores de render
    │   ├── Logo/            Logo (SVG) usado en sidebar/login y PDFs
    │   ├── Paginacion/      Paginación de tablas (define PAGE_SIZE)
    │   ├── Skeleton/        Placeholders de carga (listados, perfil)
    │   └── UI/              Piezas de interfaz:
    │       ├── Boton, Campo, DatePicker        Controles de formulario
    │       ├── ModalEditarTransaccion          Editar folio/fechas de una transacción
    │       ├── ModalAnularTransaccion          Anular transacción (revierte puntos)
    │       ├── ModalAnularOperador             Anular consumo de tour operador
    │       ├── ModalExito                      Check de éxito con auto-cierre
    │       └── Resumen                         Fila de totales de un listado
    │
    ├── paginas/
    │   ├── Acceso/          Login del personal
    │   ├── Administracion/
    │   │   ├── Panel.jsx    Layout con sidebar (contenedor de los módulos)
    │   │   └── Inicio.jsx   Dashboard (resumen, gráfico, top clientes)
    │   └── Modulos/         Un archivo por pantalla del sidebar:
    │       ├── Clientes.jsx             CRUD de clientes
    │       ├── Transacciones.jsx        Registrar consumo y otorgar puntos
    │       ├── Historial.jsx            Historial de transacciones (con anulación)
    │       ├── HistorialCliente.jsx     Perfil del cliente (puntos + historial + PDF)
    │       ├── Operadores.jsx           Tour operadores
    │       ├── HistorialOperadores.jsx  Historial de operadores
    │       ├── Promociones.jsx          Gestión de promociones
    │       ├── Configuracion.jsx        Parámetros del sistema
    │       ├── PlantillasCorreo.jsx     Editor de correos con vista previa
    │       ├── IntegracionPos.jsx       Sincronización con el POS externo
    │       └── Usuarios.jsx             CRUD de usuarios del personal
    │
    ├── redux/
    │   ├── store.js         Configuración del store
    │   └── slices/sliceAuth.js   Estado de sesión (usuario/token)
    │
    ├── servicios/           Llamadas a la API agrupadas por recurso
    │   └── servicio*.js     (Auth, Clientes, Transacciones, Promociones, Pos, ...)
    │
    ├── tema/
    │   ├── ContextoTema.jsx Proveedor de tema (claro/oscuro)
    │   ├── SelectorTema.jsx Botón para alternar el tema
    │   └── tema.css         Variables de color por tema
    │
    └── utilidades/
        ├── carga.js         Helpers de carga (mínimo de spinner, mensajes de error)
        ├── csv.js           Exportar listados a CSV
        ├── pdf.js           Exportar a PDF (historial general y perfil de cliente)
        ├── formato.js       Formateo de documento (DUI/Pasaporte), fechas, etc.
        └── roles.js         Utilidades de roles/permisos
```
