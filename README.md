# 🚛 Transporte CBG

Sistema web de gestión integral para una empresa de transporte de cargas. Reemplaza las planillas de Excel y los papeles sueltos por una plataforma centralizada donde se registran viajes, cargas, kilómetros y combustible, y se controla automáticamente el consumo para detectar pérdidas o cobros de más.

---

## 🎯 El problema que resuelve

En el transporte de cargas, **el combustible es uno de los mayores costos y uno de los más difíciles de controlar**. Con planillas manuales es casi imposible saber si un camión gastó de más en un viaje, o si la estación cobró litros que nunca se cargaron.

Transporte CBG ataca ese problema de frente:

- Por cada viaje registra los **kilómetros recorridos** y los **litros de combustible cargados** (ida y vuelta).
- Calcula el **consumo real** (litros por kilómetro) y lo compara contra un **consumo esperado de referencia (0,32 – 0,34 L/km)**.
- Muestra la **diferencia** entre lo que se debería haber gastado y lo que realmente se cargó.
- Cuando el consumo **supera el umbral eficiente (0,34 L/km)**, dispara una **⚠️ alerta de consumo ineficiente / exceso**, marcando el viaje para que el área administrativa lo revise.

De esa forma, un desvío anormal —ya sea por una pérdida de combustible, un mal uso del camión o un cobro de más en la estación— deja de pasar inadvertido entre cientos de filas de una planilla.

---

## ✨ Funcionalidades principales

- 🔐 **Login seguro** con un único perfil administrativo (JWT en cookies httpOnly, con refresh automático de sesión).
- 🧾 **Registro de viajes** con tipo de carga, destino, kilómetros, estaciones de servicio y combustible de ida y vuelta.
- ⛽ **Control de combustible automático**: cálculo de consumo, comparación contra el consumo esperado y alerta ante desvíos anormales.
- 👷 **Gestión de choferes** con documentación y bajas lógicas (no se borran, se dan de baja preservando el historial).
- 🚚 **Gestión de chasis y acoplados**, con odómetro recalculado automáticamente a partir de los viajes no anulados.
- 🏢 **Gestión de empresas** clientes.
- 💰 **Pagos a choferes** y **pagos de empresas**, con estados de facturación, liquidación y pago derivados de los datos.
- 📄 **Facturación** y exportación de reportes a **PDF**.
- 📊 **Métricas y reportes** sobre viajes, consumo y estados.
- 🔔 **Vencimientos de documentación**: un cron diario recalcula el estado de choferes, chasis y acoplados y marca lo que está por vencer.
- 📷 **Carga de comprobantes e imágenes** (facturas, documentación) a Cloudinary.
- 📴 **Soporte offline**: detecta la pérdida de conexión y lo informa sin desloguear al usuario.

---

## 🛠️ Stack tecnológico

### Backend
- **Node.js** (ESM) + **Express 5**
- **MySQL** con **Knex** (query builder + migraciones)
- **Autenticación:** JSON Web Tokens (`jsonwebtoken`) en cookies httpOnly + `bcrypt` para contraseñas
- **Validación:** Joi
- **Seguridad:** Helmet, CORS, `express-rate-limit`
- **Subida de archivos:** Multer + Cloudinary (`multer-storage-cloudinary`)
- **Tareas programadas:** `node-cron`
- **Logging:** Pino

### Frontend
- **React 19** + **Vite 7**
- **React Router DOM 7**
- **Estado:** Context API (un provider por dominio)
- **HTTP:** Axios (con `withCredentials` y refresh automático de token)
- **UI:** Material UI (MUI 7) + React-Bootstrap 5 + `material-react-table`
- **Alertas:** SweetAlert2 + Sonner
- **Reportes PDF:** jsPDF + jspdf-autotable

### Estructura del proyecto

```
TransporteCBG/
├── backend/        # API REST (Node + Express 5, Knex sobre MySQL)
│   └── src/
│       ├── routes/         # Rutas por dominio (/api/*)
│       ├── controllers/    # Lógica de cada dominio
│       ├── middlewares/    # Autenticación y validadores Joi
│       ├── services/       # Cron de vencimientos
│       └── config/         # Configuración y variables de entorno
├── frontend/       # SPA (React 19 + Vite)
│   └── src/
│       ├── pages/          # Vistas por dominio
│       ├── components/     # Componentes y formularios (modales)
│       ├── context/        # Providers de estado por dominio
│       ├── routes/         # Routing + rutas protegidas
│       └── api/            # Cliente Axios
└── scripts/dev.mjs # Orquestador: levanta backend + frontend en paralelo
```

> Es un monorepo con dos paquetes independientes. No usa workspaces de npm: las dependencias se instalan por separado en `backend/` y `frontend/`.

---

## 🖼️ Capturas

> ⚠️ El sistema se encuentra en producción con datos reales de la empresa, por lo
> que no se publican capturas con información sensible. Puedo mostrar una demo en
> vivo con datos de prueba a pedido.

| Vista | Captura |
|-------|---------|
| Login | `![Login](./screenshots/login.png)` |
| Panel principal | `![Home](./screenshots/home.png)` |
| Registro de viaje y control de combustible | `![Viajes](./screenshots/viajes.png)` |
| Alerta de consumo ineficiente | `![Alerta combustible](./screenshots/alerta-combustible.png)` |
| Métricas / reportes | `![Métricas](./screenshots/metricas.png)` |

---

## 🚀 Cómo correrlo localmente

### Requisitos previos
- [Node.js 18+] <!-- confirmá la versión exacta que usás -->
- Una base de datos **MySQL** accesible
- Una cuenta de **Cloudinary** (para la subida de comprobantes)

### 1. Clonar el repositorio

```bash
git clone <URL-del-repo>
cd TransporteCBG
```

### 2. Configurar variables de entorno del backend

Creá un archivo `backend/.env` con las siguientes variables (sin exponer valores reales):

```env
PORT=4006
NODE_ENV=development
DB_ENV=development
CONNECTION_STRING=      # string de conexión MySQL
JWT_SECRET=             # obligatoria; el backend no arranca sin ella (recomendado ≥ 32 caracteres)
CORS_ORIGINS=           # orígenes permitidos, separados por coma
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Opcionalmente, en el frontend podés definir `VITE_API_BASE_URL` (por defecto `http://localhost:4006/api`).

### 3. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 4. Correr las migraciones de la base de datos

```bash
cd backend
npm run migrate
cd ..
```

### 5. Levantar el proyecto

```bash
# Desde la raíz: backend + frontend en paralelo
npm run dev

# O cada uno por separado:
npm run dev:backend    # solo API    (http://localhost:4006)
npm run dev:frontend   # solo la SPA  (http://localhost:5177)
```

El frontend queda disponible en **http://localhost:5177** y la API en **http://localhost:4006/api**.

### Otros comandos útiles

```bash
# Backend (cd backend)
npm run migrate:make <nombre>   # Crear una nueva migración
npm run migrate:rollback        # Revertir la última migración

# Frontend (cd frontend)
npm run build                   # Build de producción
npm run preview                 # Previsualizar el build
npm run lint                    # ESLint
```

---

## 👤 Autor

**Ignacio Skibski** — Full Stack Developer

- 💼 LinkedIn: [ignacio-skibski](https://www.linkedin.com/in/ignacio-skibski-366877247)
- 📧 Email: [nanoskibski@gmail.com](mailto:nanoskibski@gmail.com)
