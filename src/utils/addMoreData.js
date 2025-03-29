const { redisClient, connectRedis } = require('../config/redis');

// Más vehículos con los nuevos atributos
const additionalVehicles = [
  {
    id: 'BUS003',
    type: 'BUS',
    route: 'ROUTE1',
    location: { latitude: 19.438712, longitude: -99.153102 },
    occupancy: 55,
    occupancyStop: 12, // Personas esperando en la parada actual
    price: 15.00, // Precio del boleto en pesos
    status: 'active',
    lastUpdate: Date.now()
  },
  {
    id: 'BUS004',
    type: 'BUS',
    route: 'ROUTE3',
    location: { latitude: 19.425519, longitude: -99.166320 },
    occupancy: 30,
    occupancyStop: 8,
    price: 12.50,
    status: 'active',
    lastUpdate: Date.now()
  },
  {
    id: 'TRAIN002',
    type: 'TRAIN',
    route: 'ROUTE2',
    location: { latitude: 19.412519, longitude: -99.146320 },
    occupancy: 70,
    occupancyStop: 25,
    price: 20.00,
    status: 'active',
    lastUpdate: Date.now()
  },
  {
    id: 'BUS005',
    type: 'BUS',
    route: 'ROUTE3',
    location: { latitude: 19.430519, longitude: -99.161320 },
    occupancy: 40,
    occupancyStop: 15,
    price: 12.50,
    status: 'active',
    lastUpdate: Date.now()
  },
  {
    id: 'MINIBUS001',
    type: 'MINIBUS',
    route: 'ROUTE4',
    location: { latitude: 19.434562, longitude: -99.177721 },
    occupancy: 85,
    occupancyStop: 10,
    price: 10.00,
    status: 'active',
    lastUpdate: Date.now()
  }
];

// Más rutas
const additionalRoutes = [
  {
    id: 'ROUTE3',
    name: 'Periferia Sur',
    type: 'BUS',
    stops: [
      { id: 'STOP8', name: 'Terminal Sur', coordinates: { latitude: 19.414562, longitude: -99.167721 } },
      { id: 'STOP9', name: 'Parque Industrial', coordinates: { latitude: 19.425519, longitude: -99.166320 } },
      { id: 'STOP10', name: 'Universidad', coordinates: { latitude: 19.430519, longitude: -99.161320 } }
    ]
  },
  {
    id: 'ROUTE4',
    name: 'Circuito Interior',
    type: 'MINIBUS',
    stops: [
      { id: 'STOP11', name: 'Mercado Central', coordinates: { latitude: 19.432608, longitude: -99.133209 } },
      { id: 'STOP12', name: 'Hospital General', coordinates: { latitude: 19.434562, longitude: -99.177721 } },
      { id: 'STOP13', name: 'Parque Recreativo', coordinates: { latitude: 19.438712, longitude: -99.153102 } },
      { id: 'STOP14', name: 'Centro Comercial', coordinates: { latitude: 19.425519, longitude: -99.166320 } }
    ]
  },
  {
    id: 'ROUTE5',
    name: 'Expreso Aeropuerto',
    type: 'PREMIUM_BUS',
    stops: [
      { id: 'STOP15', name: 'Centro de la Ciudad', coordinates: { latitude: 19.432608, longitude: -99.133209 } },
      { id: 'STOP16', name: 'Zona Hotelera', coordinates: { latitude: 19.436712, longitude: -99.143102 } },
      { id: 'STOP17', name: 'Terminal Aeropuerto', coordinates: { latitude: 19.444562, longitude: -99.167721 } }
    ],
    price: 35.00 // Las rutas premium pueden tener precio fijo
  }
];

// Actualizar vehículos existentes para incluir los nuevos atributos
async function updateExistingVehicles() {
  try {
    // Obtener vehículos existentes
    const vehicleKeys = await redisClient.keys('vehicle:*');
    
    for (const key of vehicleKeys) {
      const vehicleData = await redisClient.get(key);
      if (vehicleData) {
        const vehicle = JSON.parse(vehicleData);
        
        // Añadir nuevos atributos si no existen
        if (vehicle.occupancyStop === undefined) {
          vehicle.occupancyStop = Math.floor(Math.random() * 20); // Valor aleatorio entre 0 y 20
        }
        
        if (vehicle.price === undefined) {
          // Asignar precio según el tipo de vehículo
          if (vehicle.type === 'BUS') {
            vehicle.price = 12.00;
          } else if (vehicle.type === 'TRAIN') {
            vehicle.price = 20.00;
          } else {
            vehicle.price = 15.00;
          }
        }
        
        // Guardar de vuelta en Redis
        await redisClient.set(key, JSON.stringify(vehicle));
        console.log(`Actualizados nuevos atributos para ${key}`);
      }
    }
  } catch (error) {
    console.error('Error actualizando vehículos existentes:', error);
  }
}

/**
 * Función para agregar más datos a la base de datos
 */
async function addMoreData() {
  try {
    console.log('Connecting to Redis...');
    await connectRedis();
    console.log('Connected to Redis Cloud server');

    console.log('Adding more data to the database...');

    // Actualizar vehículos existentes con nuevos atributos
    await updateExistingVehicles();

    // Agregar nuevos vehículos
    for (const vehicle of additionalVehicles) {
      await redisClient.set(`vehicle:${vehicle.id}`, JSON.stringify(vehicle));
      console.log(`Added new vehicle: ${vehicle.id}`);
    }

    // Agregar nuevas rutas
    for (const route of additionalRoutes) {
      await redisClient.set(`route:${route.id}`, JSON.stringify(route));
      console.log(`Added new route: ${route.id}`);
    }

    console.log('Additional data has been added successfully!');

    // Cerrar la conexión
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error adding more data:', error);
  }
}

// Ejecutar la función si este archivo se ejecuta directamente
if (require.main === module) {
  addMoreData();
}

module.exports = { addMoreData }; 