# Semilla de BD para una empresa (crear a mano)

Esta carpeta tiene la base de datos completa para montar el sistema en **otra empresa**,
igual que `backend/src/semillas/` es la de Punta Diamantes. Sirve para crearla **a mano**
en MySQL Workbench (sin scripts), y para dejar claro **qué tablas son nuevas** por la
integración con el POS —útil si a futuro se lo vendemos a otra empresa.

---

## Archivos

| Archivo | Qué es |
|---|---|
| **db_fidelizacion_merasopa.sql** | La base **completa en un solo archivo**: todas las tablas + catálogos + **las 3 tablas del POS** + un admin de arranque. Crea `db_fidelizacion_merasopa`. |

> Las 3 tablas del POS vienen **dentro** de este mismo archivo (sección
> "TABLAS DE LA INTEGRACIÓN POS"), así que con ejecutarlo completo ya quedan creadas.

---

## Cómo crear la BD a mano (MySQL Workbench)

1. Abre **db_fidelizacion_merasopa.sql** y ejecútalo **completo** → crea la base con todo
   el sistema, las tablas del POS y un admin. (Ya no necesitas correr nada más.)
2. Entra al panel (apuntado a esa instancia) con:
   - **Correo:** `admin@empresa.com`  **Contraseña:** `Admin123`  *(cámbiala luego)*

> Para **otra** empresa: en Workbench haz "Buscar y reemplazar" de
> `db_fidelizacion_merasopa` por el nombre que quieras, antes de ejecutar.

---

## ⭐ Las 3 tablas NUEVAS del POS (esto es lo que se agrega al sistema)

Si ya tienes una BD del sistema funcionando y **solo** quieres habilitarle la integración
POS, agrégale **estas 3 tablas** (cópialas de la sección "TABLAS DE LA INTEGRACIÓN POS" de
`db_fidelizacion_merasopa.sql`). El resto del sistema NO cambia:

| Tabla | Para qué sirve |
|---|---|
| **pos_configuracion** | Guarda los datos de conexión al POS (`servidor` / puerto / usuario / `contrasena` / base) y el modo (automático/manual). Una sola fila. |
| **pos_pedido_procesado** | Marca qué pedidos del POS ya se convirtieron en transacción, para **no dar puntos dos veces**. |
| **pos_cliente_procesado** | Marca qué clientes del POS ya se trajeron al módulo, para **no duplicarlos** y no re-escanear todo en cada sincronización. |

**Ninguna toca las tablas existentes** — son aditivas. Por eso Punta Diamantes puede vivir
sin ellas, y una empresa que use el POS solo necesita agregarlas.

> Nota: las columnas se llaman **`servidor`** y **`contrasena`** (no `host`/`password`) porque
> esas dos son palabras reservadas en MySQL. Las BD nuevas ya nacen con estos nombres.
