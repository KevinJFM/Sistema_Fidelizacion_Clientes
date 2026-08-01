# Integración POS — qué necesitamos del POS de una empresa

Esta guía explica **qué tablas y campos** necesita nuestro sistema en la base del POS de una
empresa para poder integrarla (traer sus clientes y otorgar puntos por sus pagos), y **qué
pedirle a una empresa nueva** para adaptarla.

> Principio: **solo lectura** sobre el POS. Nunca modificamos su base. Leemos sus clientes y
> pagos y guardamos una copia (clientes, transacciones y puntos) en **nuestra** BD de esa empresa.
> El modelo de referencia es el POS `eorderback` (el que usa Merasopa).

---

## 1) Qué LEE nuestro sistema del POS

Nuestra sincronización ([pos.servicio.js](pos.servicio.js)) espera **4 tablas** con estos campos:

| Tabla del POS | Campos que usamos | Para qué |
|---|---|---|
| **cliente** | `idCliente`, `nombre`, `email`, `telefono`, `NIT`, `idDocumento` | Identificar/crear al cliente. El **número** de documento sale de `NIT`. |
| **documento** | `idDocumento`, `tipoDocumento` | Catálogo del tipo de documento (DUI, Pasaporte, NIT, Otro, Carnet). Nos dice si el `NIT` es un DUI o Pasaporte. |
| **pedido** | `idPedido`, `idCliente`, `fecha`, `total`, `totalPago`, `anular` | El consumo. `total` = monto para puntos; `totalPago` = lo que debía pagar. |
| **pago_combinado** | `idPedido`, `monto`, `fechaPago` | Los pagos/abonos de cada pedido. Sumamos `monto` para saber si ya pagó completo. |

Si el POS de la nueva empresa usa **otros nombres** de tablas/campos, hay que **mapearlos**
(ver punto 4).

---

## 2) Cómo identificamos al cliente (¿DUI o Pasaporte?)

- El **tipo** de documento se lee de `documento.tipoDocumento`; el **número**, del campo `cliente.NIT`.
- **Solo creamos** al cliente en nuestro sistema si trae **DUI** o **Pasaporte** (son los que
  nuestro módulo de Clientes admite). NIT / Otro / Carnet **no** crean cliente.
- Si el cliente ya existe en nuestra base, lo **emparejamos** por documento → correo → teléfono
  (no se duplica).
- "Consumidor final" o clientes sin documento identificable: **no** ganan puntos.

**Lo que hay que revisar en cada empresa:** ¿guardan el DUI/Pasaporte de sus clientes? ¿en qué
campo? ¿tienen un catálogo de tipos de documento? Si **no** identifican al cliente (todo es
"consumidor final"), no se le pueden otorgar puntos automáticamente.

---

## 3) Cómo detectamos el pago (¿completo o abonos?)

- Solo damos puntos cuando el pedido está **pagado por completo**: la **suma** de
  `pago_combinado.monto` de ese pedido **cubre** el `totalPago`.
- Así soporta **abonos**: se van sumando; mientras no completen el total, no otorga puntos.
- Excluimos los **anulados** (`anular = 1`). *(En eorderback, `cancelado = 1` significa
  "cobrado/pagado", NO anulado, por eso ese campo no se filtra.)*
- Puntos = `total` del pedido, regla **$1 = 1 punto**.

**Lo que hay que revisar en cada empresa:** ¿cómo registran los pagos? ¿una sola tabla o
varias? ¿manejan abonos? ¿qué campo es el total a pagar y cuál lo ya pagado? ¿cómo marcan un
pedido cobrado vs anulado?

---

## 4) Cómo adaptar el POS de una empresa NUEVA

1. **Pide un dump** (o acceso de **solo lectura**) a su base del POS. Para que el backend en
   producción pueda conectarse a esa base de forma remota, ver
   [guias/CONEXION_REMOTA_POS.md](guias/CONEXION_REMOTA_POS.md).
2. Revísalo y ubica lo del punto 1: dónde están sus **clientes + documento** y sus
   **pedidos + pagos**.
3. Ajusta las **consultas** en [pos.servicio.js](pos.servicio.js) (`sincronizarClientes` y
   `sincronizarPagos`) para que apunten a **sus** nombres de tablas/campos. Es lo único que
   cambia por empresa; la lógica (identificar, puntos, no duplicar) se queda igual.
4. Si su modelo es muy distinto (ej. no manejan abonos, o el documento va en otro lado),
   adapta esa parte puntual.

---

## 5) Qué se agrega a NUESTRA base (no al POS)

En la BD de fidelización de la empresa se crean **3 tablas** (aditivas, no tocan nada
existente). Ya vienen en `semilla_empresa/db_fidelizacion_merasopa.sql`:

| Tabla | Para qué |
|---|---|
| **pos_configuracion** | Datos de conexión al POS (`servidor`/puerto/usuario/`contrasena`/base) + modo (auto/manual). |
| **pos_pedido_procesado** | Evita dar puntos dos veces por el mismo pedido. |
| **pos_cliente_procesado** | Evita duplicar clientes y no re-escanear todo cada sincronización. |

---

## Resumen para una empresa nueva
1. Pedir dump / acceso de lectura a su POS.
2. Confirmar que identifican al cliente (DUI/Pasaporte) y cómo registran los pagos.
3. Adaptar las consultas de `pos.servicio.js` a sus tablas/campos.
4. Crear su BD de fidelización con las 3 tablas del POS (`semilla_empresa/`).
5. Conectar y sincronizar desde el panel → **Integración POS**.
