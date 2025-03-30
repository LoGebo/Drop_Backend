# API de Seguimiento de Transporte en Tiempo Real

Esta API proporciona funcionalidades para el seguimiento de vehículos en tiempo real y la sugerencia de rutas para pasajeros.

## Estructura del Proyecto

```
/
├── src/                  # Código fuente
│   ├── config/           # Configuración (Redis)
│   ├── routes/           # Rutas y controladores de la API
│   │   ├── index.js      # Configuración de rutas principales
│   │   ├── routesController.js  # Controlador de rutas
│   │   └── vehiclesController.js  # Controlador de vehículos
│   ├── sockets/          # Gestión de WebSockets
│   └── index.js          # Punto de entrada de la aplicación
└── .env                  # Variables de entorno
```

## Endpoints de la API

### Sugerencia de Rutas

**Solicitar una ruta óptima**

```
POST /api/routes/suggest
```

**Cuerpo de la solicitud:**
```json
{
  "origin": {
    "lat": 19.432608,
    "lng": -99.133209
  },
  "destination": {
    "lat": 19.336,
    "lng": -99.167
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "route": {
    "origin": {
      "lat": 19.432608,
      "lng": -99.133209
    },
    "destination": {
      "lat": 19.336,
      "lng": -99.167
    },
    "eta": "25 min",
    "fare": "$2.50",
    "stops": [
      {
        "name": "Stop 1",
        "eta": "5 min",
        "coordinates": {
          "lat": 19.442608,
          "lng": -99.123209
        }
      },
      {
        "name": "Stop 2",
        "eta": "15 min",
        "coordinates": {
          "lat": 19.452608,
          "lng": -99.113209
        }
      },
      {
        "name": "Destination",
        "eta": "25 min",
        "coordinates": {
          "lat": 19.336,
          "lng": -99.167
        }
      }
    ],
    "vehicleInfo": {
      "id": "V123",
      "type": "Bus",
      "occupancy": 45,
      "currentLocation": {
        "lat": 19.427608,
        "lng": -99.138209
      }
    }
  }
}
```

### Información de Vehículos

**Obtener datos de un vehículo específico**

```
GET /api/vehicles/:vehicleId
```

**Respuesta:**
```json
{
  "success": true,
  "vehicle": {
    "id": "V123",
    "location": {
      "latitude": 19.427608,
      "longitude": -99.138209
    },
    "occupancy": 45,
    "routeId": "R001",
    "lastUpdate": 1616789123456
  }
}
```

**Obtener todos los vehículos en una ruta**

```
GET /api/routes/:routeId/vehicles
```

**Respuesta:**
```json
{
  "success": true,
  "vehicles": [
    {
      "id": "V123",
      "location": {
        "latitude": 19.427608,
        "longitude": -99.138209
      },
      "occupancy": 45,
      "routeId": "R001",
      "lastUpdate": 1616789123456
    },
    {
      "id": "V124",
      "location": {
        "latitude": 19.425608,
        "longitude": -99.139209
      },
      "occupancy": 60,
      "routeId": "R001",
      "lastUpdate": 1616789123556
    }
  ]
}
```

## Eventos de WebSocket

### Eventos del Conductor

**Enviar actualización de ubicación**

```javascript
socket.emit('driver:location', {
  vehicleId: 'V123',
  latitude: 19.427608,
  longitude: -99.138209,
  occupancy: 45,
  routeId: 'R001'
});
```

### Eventos del Pasajero

**Seguir un vehículo específico**

```javascript
socket.emit('passenger:follow-vehicle', 'V123');
```

**Seguir una ruta específica**

```javascript
socket.emit('passenger:follow-route', 'R001');
```

**Recibir actualizaciones de ubicación**

```javascript
socket.on('vehicle:update', (vehicleData) => {
  console.log('Vehicle updated:', vehicleData);
});
```

**Recibir vehículos en una ruta**

```javascript
socket.on('route:vehicles', (vehicles) => {
  console.log('Vehicles in route:', vehicles);
});
```

## Configuración del Entorno

Para ejecutar la aplicación, crea un archivo `.env` con las siguientes variables:

```
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

## Ejecutar la Aplicación

```
# Instalación de dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Iniciar en modo producción
npm start
``` 