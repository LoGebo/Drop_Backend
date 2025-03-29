const express = require('express');
const { redisClient } = require('../config/redis');
const router = express.Router();

/**
 * Obtener todas las rutas disponibles
 * @route GET /api/routes
 */
const getAllRoutes = async (req, res) => {
  try {
    // Obtener todas las claves de rutas
    const routeKeys = await redisClient.keys('route:*');
    
    if (!routeKeys || routeKeys.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        routes: []
      });
    }
    
    // Obtener datos de todas las rutas
    const routes = [];
    for (const key of routeKeys) {
      const routeData = await redisClient.get(key);
      if (routeData) {
        routes.push(JSON.parse(routeData));
      }
    }
    
    return res.status(200).json({
      success: true,
      count: routes.length,
      routes
    });
  } catch (error) {
    console.error('Error obteniendo rutas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener rutas'
    });
  }
};

/**
 * Obtener una ruta específica
 * @route GET /api/routes/:routeId
 */
const getRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // Obtener datos de la ruta
    const routeData = await redisClient.get(`route:${routeId}`);
    
    if (!routeData) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      route: JSON.parse(routeData)
    });
  } catch (error) {
    console.error('Error obteniendo datos de la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de la ruta'
    });
  }
};

/**
 * Calcular ruta óptima para el pasajero
 * @route POST /api/routes/suggest
 */
const suggestRoute = async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren origen y destino'
      });
    }
    
    // Ejemplo de lógica para calcular ruta (en una implementación real esto usaría algoritmos más complejos)
    // y consultaría datos actuales de los vehículos almacenados en Redis
    
    // Simular cálculo de ruta óptima
    const suggestedRoute = await calculateOptimalRoute(origin, destination);

    return res.status(200).json({
      success: true,
      route: suggestedRoute
    });
  } catch (error) {
    console.error('Error calculando ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al calcular ruta'
    });
  }
};

/**
 * Obtener todos los vehículos en una ruta específica
 * @route GET /api/routes/:routeId/vehicles
 */
const getRouteVehicles = async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // Obtener todas las claves de vehículos
    const vehicleKeys = await redisClient.keys('vehicle:*');
    const vehicles = [];
    
    // Filtrar vehículos por ruta
    for (const key of vehicleKeys) {
      const vehicleData = await redisClient.get(key);
      if (vehicleData) {
        const vehicle = JSON.parse(vehicleData);
        if (vehicle.route === routeId) {
          vehicles.push(vehicle);
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles
    });
  } catch (error) {
    console.error('Error obteniendo vehículos de la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos de la ruta'
    });
  }
};

/**
 * Crear una nueva ruta
 * @route POST /api/routes
 */
const createRoute = async (req, res) => {
  try {
    const { id, name, type, stops } = req.body;
    
    if (!id || !name || !stops || !Array.isArray(stops)) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren id, nombre y paradas (array)'
      });
    }
    
    // Verificar si la ruta ya existe
    const routeExists = await redisClient.exists(`route:${id}`);
    
    if (routeExists) {
      return res.status(400).json({
        success: false,
        message: 'La ruta con este ID ya existe'
      });
    }
    
    // Crear nueva ruta
    const newRoute = {
      id,
      name,
      type: type || 'BUS',
      stops,
      createdAt: Date.now()
    };
    
    // Guardar en Redis
    await redisClient.set(`route:${id}`, JSON.stringify(newRoute));
    
    return res.status(201).json({
      success: true,
      message: 'Ruta creada exitosamente',
      route: newRoute
    });
  } catch (error) {
    console.error('Error creando ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear ruta'
    });
  }
};

/**
 * Función para calcular la ruta óptima
 * @param {Object} origin - Coordenadas de origen
 * @param {Object} destination - Coordenadas de destino
 * @returns {Object} Información de la ruta calculada
 */
async function calculateOptimalRoute(origin, destination) {
  // En una implementación real, esto haría lo siguiente:
  // 1. Buscar rutas cercanas al origen y destino
  // 2. Calcular tiempos estimados basados en la ubicación actual de los vehículos
  // 3. Considerar la ocupación de los vehículos
  // 4. Calcular el costo del viaje
  
  // Por ahora, utilizaremos datos simulados y consultaremos algunos datos reales de Redis
  
  // Obtener todas las rutas
  const routeKeys = await redisClient.keys('route:*');
  const routes = [];
  
  for (const key of routeKeys) {
    const routeData = await redisClient.get(key);
    if (routeData) {
      routes.push(JSON.parse(routeData));
    }
  }
  
  // Verificar si hay rutas disponibles
  if (!routes.length) {
    return {
      origin,
      destination,
      message: "No hay rutas disponibles"
    };
  }
  
  // Seleccionar una ruta aleatoria (simulación)
  const selectedRoute = routes[Math.floor(Math.random() * routes.length)];
  
  // Obtener vehículos en esta ruta
  const vehicleKeys = await redisClient.keys('vehicle:*');
  const routeVehicles = [];
  
  for (const key of vehicleKeys) {
    const vehicleData = await redisClient.get(key);
    if (vehicleData) {
      const vehicle = JSON.parse(vehicleData);
      if (vehicle.route === selectedRoute.id) {
        routeVehicles.push(vehicle);
      }
    }
  }
  
  // Seleccionar un vehículo (el primero o nulo si no hay)
  const vehicle = routeVehicles.length > 0 ? routeVehicles[0] : null;
  
  return {
    origin,
    destination,
    eta: "25 min",
    fare: "$2.50",
    stops: selectedRoute.stops.map(stop => ({
      name: stop.name,
      eta: Math.floor(Math.random() * 30) + " min",
      coordinates: stop.coordinates
    })),
    route: {
      id: selectedRoute.id,
      name: selectedRoute.name,
      type: selectedRoute.type
    },
    vehicleInfo: vehicle ? {
      id: vehicle.id,
      type: vehicle.type,
      occupancy: vehicle.occupancy || 0,
      currentLocation: vehicle.location
    } : null
  };
}

module.exports = {
  getAllRoutes,
  getRouteById,
  suggestRoute,
  getRouteVehicles,
  createRoute
}; 