/**
 * Datos de ejemplo para el transporte
 */

// Datos de ejemplo para vehículos
const mockVehicles = [
  {
    id: 'BUS001',
    type: 'BUS',
    route: 'ROUTE1',
    location: { latitude: 19.432608, longitude: -99.133209 },
    occupancy: 35, // porcentaje
    status: 'active',
    lastUpdate: Date.now()
  },
  {
    id: 'BUS002',
    type: 'BUS',
    route: 'ROUTE1',
    location: { latitude: 19.436712, longitude: -99.143102 },
    occupancy: 65,
    status: 'active',
    lastUpdate: Date.now()
  },
  {
    id: 'TRAIN001',
    type: 'TRAIN',
    route: 'ROUTE2',
    location: { latitude: 19.422519, longitude: -99.156320 },
    occupancy: 80,
    status: 'active',
    lastUpdate: Date.now()
  }
];

// Datos de ejemplo para rutas
const mockRoutes = [
  {
    id: 'ROUTE1',
    name: 'Centro - Aeropuerto',
    type: 'BUS',
    stops: [
      { id: 'STOP1', name: 'Estación Central', coordinates: { latitude: 19.432608, longitude: -99.133209 } },
      { id: 'STOP2', name: 'Plaza Principal', coordinates: { latitude: 19.436712, longitude: -99.143102 } },
      { id: 'STOP3', name: 'Terminal de Autobuses', coordinates: { latitude: 19.442519, longitude: -99.156320 } },
      { id: 'STOP4', name: 'Aeropuerto', coordinates: { latitude: 19.444562, longitude: -99.167721 } }
    ]
  },
  {
    id: 'ROUTE2',
    name: 'Línea 1 Tren',
    type: 'TRAIN',
    stops: [
      { id: 'STOP5', name: 'Terminal Norte', coordinates: { latitude: 19.432608, longitude: -99.133209 } },
      { id: 'STOP6', name: 'Centro Histórico', coordinates: { latitude: 19.422519, longitude: -99.156320 } },
      { id: 'STOP7', name: 'Terminal Sur', coordinates: { latitude: 19.414562, longitude: -99.167721 } }
    ]
  }
];

module.exports = {
  mockVehicles,
  mockRoutes
}; 