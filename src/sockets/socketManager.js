const { Server } = require('socket.io');
const { redisClient } = require('../config/redis');

// Almacenamiento en memoria para las ubicaciones de vehículos activos
let activeVehicles = {};

// Inicializar el servidor de Socket.io
const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // En producción, esto debería limitarse a dominios específicos
      methods: ['GET', 'POST']
    }
  });

  // Manejar conexiones de socket
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Evento para conductores que envían su ubicación
    socket.on('driver:location', async (data) => {
      try {
        const { vehicleId, latitude, longitude, occupancy, occupancyStop, price, routeId } = data;

        if (!vehicleId || !latitude || !longitude) {
          return socket.emit('error', { message: 'Missing required fields' });
        }

        // Guardar datos del vehículo
        const vehicleData = {
          id: vehicleId,
          location: { latitude, longitude },
          occupancy: occupancy || 0,
          occupancyStop: occupancyStop || 0,
          price: price || 0,
          routeId: routeId,
          lastUpdate: Date.now()
        };

        // Almacenar en memoria
        activeVehicles[vehicleId] = vehicleData;

        // Almacenar en Redis (como clave-valor y para pub/sub)
        await redisClient.set(`vehicle:${vehicleId}`, JSON.stringify(vehicleData));
        await redisClient.publish('vehicle:updates', JSON.stringify(vehicleData));

        // Emitir a todos los clientes que están siguiendo este vehículo o ruta
        io.to(`vehicle:${vehicleId}`).emit('vehicle:update', vehicleData);
        if (routeId) {
          io.to(`route:${routeId}`).emit('vehicle:update', vehicleData);
        }
      } catch (error) {
        console.error('Error processing driver location:', error);
        socket.emit('error', { message: 'Failed to process location update' });
      }
    });

    // Evento para pasajeros que siguen un vehículo específico
    socket.on('passenger:follow-vehicle', (vehicleId) => {
      socket.join(`vehicle:${vehicleId}`);
      
      // Enviar datos actuales del vehículo si está activo
      if (activeVehicles[vehicleId]) {
        socket.emit('vehicle:update', activeVehicles[vehicleId]);
      }
    });

    // Evento para pasajeros que siguen una ruta específica
    socket.on('passenger:follow-route', (routeId) => {
      socket.join(`route:${routeId}`);
      
      // Enviar datos de todos los vehículos en esta ruta
      const vehiclesInRoute = Object.values(activeVehicles)
        .filter(vehicle => vehicle.routeId === routeId);
      
      if (vehiclesInRoute.length > 0) {
        socket.emit('route:vehicles', vehiclesInRoute);
      }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = {
  initSocketServer
}; 