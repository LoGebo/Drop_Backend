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

### Planificación de Viajes Multimodal

**Solicitar una ruta óptima combinando distintos transportes**

```
POST /api/trips/plan
```

**Cuerpo de la solicitud:**
```json
{
  "origin": {
    "latitude": 19.432608,
    "longitude": -99.133209
  },
  "destination": {
    "latitude": 19.414562,
    "longitude": -99.167721
  },
  "preferences": {
    "maxWalkingDistance": 800,
    "prioritizeLowOccupancy": false,
    "prioritizeLowCost": false,
    "prioritizeFastRoute": true,
    "maxTransfers": 2,
    "transportTypes": ["BUS", "METRO", "WALK"]
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "trip": {
    "success": true,
    "origin": {
      "latitude": 19.432608,
      "longitude": -99.133209,
      "nearbyStops": [
        {
          "id": "STOP1",
          "name": "Estación Central",
          "distance": 234,
          "routeId": "ROUTE1",
          "routeName": "Ruta Centro-Norte"
        },
        {
          "id": "STOP2",
          "name": "Alameda Central",
          "distance": 456,
          "routeId": "ROUTE3",
          "routeName": "Ruta Centro-Oeste"
        }
      ]
    },
    "destination": {
      "latitude": 19.414562,
      "longitude": -99.167721,
      "nearbyStops": [
        {
          "id": "STOP5",
          "name": "Terminal Oeste",
          "distance": 123,
          "routeId": "ROUTE2",
          "routeName": "Ruta Oeste-Sur"
        }
      ]
    },
    "route": {
      "totalTime": 35,
      "totalCost": 27.00,
      "totalDistance": 5200,
      "transfers": 1,
      "segments": [
        {
          "type": "WALK",
          "from": "Origen",
          "to": "Estación Central",
          "time": 3,
          "distance": 234,
          "cost": 0,
          "description": "Caminar 0.2 km hacia Estación Central"
        },
        {
          "type": "BUS",
          "routeId": "ROUTE1",
          "routeName": "Ruta Centro-Norte",
          "from": "Estación Central",
          "to": "Estación Norte",
          "time": 15,
          "distance": 3200,
          "cost": 12.00,
          "description": "Tomar BUS ROUTE1 hacia Estación Norte"
        },
        {
          "type": "TRANSFER",
          "from": "Estación Norte",
          "to": "Estación Norte",
          "time": 5,
          "distance": 0,
          "cost": 0,
          "description": "Transbordar hacia Ruta Oeste-Sur"
        },
        {
          "type": "METRO",
          "routeId": "ROUTE2",
          "routeName": "Ruta Oeste-Sur",
          "from": "Estación Norte",
          "to": "Terminal Oeste",
          "time": 10,
          "distance": 1643,
          "cost": 15.00,
          "description": "Tomar METRO ROUTE2 hacia Terminal Oeste"
        },
        {
          "type": "WALK",
          "from": "Terminal Oeste",
          "to": "Destino",
          "time": 2,
          "distance": 123,
          "cost": 0,
          "description": "Caminar 0.1 km hacia destino"
        }
      ]
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