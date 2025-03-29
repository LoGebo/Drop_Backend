const { redisClient, connectRedis } = require('../config/redis');
const { mockVehicles, mockRoutes } = require('./transportData');

/**
 * Inicializa la base de datos Redis con datos de ejemplo
 */
async function initializeDatabase() {
  try {
    console.log('Connecting to Redis...');
    await connectRedis();

    console.log('Initializing database with sample data...');

    // Limpiar datos existentes (opcional)
    // Cuidado: esto eliminará todos los datos existentes
    // await redisClient.flushDb();

    // Almacenar los vehículos
    for (const vehicle of mockVehicles) {
      await redisClient.set(`vehicle:${vehicle.id}`, JSON.stringify(vehicle));
      console.log(`Added vehicle: ${vehicle.id}`);
    }

    // Almacenar las rutas
    for (const route of mockRoutes) {
      await redisClient.set(`route:${route.id}`, JSON.stringify(route));
      console.log(`Added route: ${route.id}`);
    }

    console.log('Database initialization complete!');

    // Muestra algunos datos para verificar
    const testVehicle = await redisClient.get('vehicle:BUS001');
    console.log('Test vehicle data:', JSON.parse(testVehicle));

    const testRoute = await redisClient.get('route:ROUTE1');
    console.log('Test route data:', JSON.parse(testRoute));

    // Cerrar la conexión
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Ejecutar la función si este archivo se ejecuta directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 