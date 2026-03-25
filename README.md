# 🚗 Mako Car Wash — PWA de Gestión

Sistema de gestión en tiempo real para lavado de autos de alto volumen en Los Cabos, México.

---

## Arquitectura

```
React 18 + Vite (PWA)
│
├── Estado UI ──── Zustand (ephemeral, in-memory)
├── Base de datos ─ Dexie.js (IndexedDB — offline-first)
├── Estilos ─────── CSS custom (mobile-first, design tokens)
└── PWA ─────────── vite-plugin-pwa + Workbox (service worker)
```

## Roles y Acceso

| Rol        | PIN defecto | Acceso |
|------------|-------------|--------|
| Dueño      | `0000`      | Dashboard remoto, caja, empleados, reporte, config |
| Encargado  | `1111`      | Todo menos config |
| Carlos     | `2222`      | Registro de autos, su rendimiento, incidentes |
| Miguel     | `3333`      | Registro de autos, su rendimiento, incidentes |
| Roberto    | `4444`      | Registro de autos, su rendimiento, incidentes |

> **Cambiar PINs en producción** — ir a Config (como Dueño) y agregar empleados con los PINs correctos.

---

## Flujo de un Auto

```
1. Empleado toca "NUEVO AUTO" (< 3 seg)
   └─ Toggle aspirado (Sí / No)
   └─ Seleccionar empleado (si es encargado)
   └─ Toca "REGISTRAR AUTO" → vibración + sonido

2. Auto siendo lavado → estado: LAVANDO (azul)
   └─ Toca la tarjeta del auto → estado: LISTO (naranja pulsante)

3. Cobrar → estado: PAGADO (verde)
   └─ Toca la tarjeta LISTO → modal de cobro
   └─ Botón grande: EFECTIVO | TARJETA
```

## Esquema de Base de Datos (IndexedDB)

```
employees:  id, name, pin, role, color, active
cars:       id, ticketId, employeeId, date, timestamp, status,
            hasVacuum, paid, paymentType, amount, paidAt
cashControl: id, date, openingCash, closingCash
incidents:  id, date, timestamp, type, employeeId, notes
```

## Estructura del Proyecto

```
src/
├── db/
│   └── db.js              ← Dexie schema + queries + mutations
├── store/
│   └── useStore.js        ← Zustand UI state
├── utils/
│   └── helpers.js         ← Stats, formatters, audio/vibration
├── styles/
│   └── global.css         ← Design system (tokens, components)
├── components/
│   ├── LoginScreen.jsx    ← PIN login (employee selector)
│   ├── Header.jsx         ← Top bar
│   ├── BottomNav.jsx      ← Role-based navigation
│   ├── CarEntryModal.jsx  ← "Nuevo Auto" form (CORE)
│   ├── CarList.jsx        ← Today's car list with status
│   ├── LiveCounter.jsx    ← Real-time car + revenue counters
│   ├── PaymentModal.jsx   ← Cash/Card payment capture
│   ├── IncidentModal.jsx  ← Report incidents
│   ├── IncidentList.jsx   ← Today's incidents
│   ├── CashControl.jsx    ← Opening/closing cash + discrepancy
│   ├── EmployeeStats.jsx  ← Per-employee performance
│   ├── DailyReport.jsx    ← Auto daily report + share
│   ├── OwnerDashboard.jsx ← Remote owner view (live)
│   └── ConfigScreen.jsx   ← Employee management (owner only)
├── screens/
│   ├── EmployeeHome.jsx   ← Employee layout
│   ├── ManagerHome.jsx    ← Manager layout
│   └── OwnerHome.jsx      ← Owner layout
├── App.jsx                ← Root router (auth → role → screen)
└── main.jsx
```

## Desarrollo

```bash
npm install
npm run dev      # localhost:5173
npm run build    # produce dist/ con PWA + Service Worker
npm run preview  # previsualizar build
```

## Instalación en Teléfono Android

1. Abrir Chrome en el teléfono
2. Navegar a la URL de la app
3. Menú → "Agregar a pantalla de inicio"
4. La app se instala como nativa (sin App Store)
5. Funciona sin internet (offline-first via IndexedDB)

## Plan de Fases

### Fase 1 (MVP — Este código)
- [x] Login por PIN por empleado
- [x] Registro de autos (< 3 seg)
- [x] Toggle aspirado
- [x] Contador en vivo (día / hora)
- [x] Cobro: efectivo vs tarjeta
- [x] Control de caja (apertura/cierre + descuadre en ROJO)
- [x] Rendimiento por empleado
- [x] Reporte diario auto-generado + compartir
- [x] Log de incidentes
- [x] Dashboard dueño (remoto, misma app)
- [x] Gestión de empleados (agregar/desactivar)
- [x] PWA instalable + offline (IndexedDB)
- [x] Vibración + sonido al registrar auto

### Fase 2 (Próximas iteraciones)
- [ ] Sync Firebase Firestore (multi-dispositivo real-time)
- [ ] Notificaciones push para el dueño
- [ ] Envío automático de reporte por WhatsApp Business API
- [ ] Historial histórico (semanas/meses)
- [ ] Foto de auto al ingresar (Camera API)
- [ ] Exportar reporte a CSV/PDF

## Seguridad

- **Sin borrado**: todos los registros son inmutables (soft-delete único para empleados)
- **Todo con timestamp**: cada evento tiene fecha/hora exacta
- **Roles**: empleado no ve caja ni reportes completos
- **PIN local**: almacenado en IndexedDB del dispositivo (sin red)
- Para Fase 2: migrar a hashed PINs y autenticación Firebase

---

Hecho con ❤️ para operaciones de alto volumen, baja fricción.
