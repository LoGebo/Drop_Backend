const express = require('express');
const router = express.Router();
const tripPlannerController = require('./tripPlannerController');
const metroData = require('../data/metroRoutes');

/**
 * @swagger
 * /api/mobile/route:
 *   post:
 *     summary: Endpoint para app móvil - Planifica una ruta entre dos puntos
 *     description: Versión simplificada para aplicaciones móviles del planificador de rutas
 *     tags: [Mobile API]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               preferences:
 *                 type: object
 *                 properties:
 *                   transportTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   maxWalkingDistance:
 *                     type: number
 *                   prioritizeFastRoute:
 *                     type: boolean
 *                   prioritizeLowCost:
 *                     type: boolean
 *                   prioritizeLowOccupancy:
 *                     type: boolean
 *                   maxTransfers:
 *                     type: number
 */
router.post('/route', async (req, res) => {
  try {
    console.log('Recibida solicitud para planificar ruta mobile:', JSON.stringify(req.body, null, 2));
    
    // Extraer datos en el formato exacto que espera el tripPlannerController
    const { origin, destination, preferences = {} } = req.body;

    // Verificar que se proporcionaron coordenadas válidas
    if (!origin || !origin.latitude || !origin.longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Las coordenadas de origen no son válidas' 
      });
    }

    if (!destination || !destination.latitude || !destination.longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Las coordenadas de destino no son válidas' 
      });
    }
    
    // Verificar y normalizar los tipos de transporte
    const transportTypes = preferences.transportTypes || ['WALKING', 'BUS', 'METRO', 'MINIBUS'];
    
    // Asegurarse de que se use el mismo formato que en la interfaz web
    const normalizedTransportTypes = transportTypes.map(type => {
      // Normalizar nombres de tipos de transporte (ej: WALKING -> WALK)
      return type === 'WALKING' ? 'WALK' : type;
    });
    
    // Configurar las preferencias exactamente igual que en route-planner.html
    const tripPreferences = {
      maxWalkingDistance: preferences.maxWalkingDistance || 800,
      transportTypes: normalizedTransportTypes,
      prioritizeFastRoute: preferences.prioritizeFastRoute !== undefined ? preferences.prioritizeFastRoute : true,
      prioritizeLowCost: preferences.prioritizeLowCost || false,
      prioritizeLowOccupancy: preferences.prioritizeLowOccupancy || false,
      maxTransfers: preferences.maxTransfers !== undefined ? preferences.maxTransfers : 2
    };

    console.log('Usando preferencias:', tripPreferences);

    // Llamar al planificador de viaje con los mismos parámetros que usa la interfaz web
    try {
      // Utilizar el mismo controlador que usa route-planner.html
      const result = await tripPlannerController.planTrip(
        {
          latitude: parseFloat(origin.latitude),
          longitude: parseFloat(origin.longitude)
        },
        {
          latitude: parseFloat(destination.latitude),
          longitude: parseFloat(destination.longitude)
        },
        tripPreferences
      );

      console.log('Resultado de planificación:', result);

      // Si no se encuentra ninguna ruta
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró una ruta entre el origen y el destino. Por favor, intente con diferentes ubicaciones o modifique sus preferencias.'
        });
      }

      // Construir la respuesta en el formato exacto que espera la aplicación
      const response = {
        success: true,
        data: result
      };

      // Devolver el mismo formato de respuesta que usa la interfaz web
      return res.status(200).json(response);
    } catch (plannerError) {
      console.error('Error en tripPlannerController.planTrip:', plannerError);
      return res.status(500).json({
        success: false,
        error: 'Error en el planificador de rutas',
        message: plannerError.message
      });
    }
  } catch (error) {
    console.error('Error en planificación de ruta para app móvil:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/mobile/metro/stations/{lineId}:
 *   get:
 *     summary: Obtiene las estaciones de una línea de metro
 *     tags: [Mobile API]
 *     parameters:
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [L1, L2]
 */
router.get('/metro/stations/:lineId', (req, res) => {
  const { lineId } = req.params;
  
  if (lineId !== 'L1' && lineId !== 'L2') {
    return res.status(400).json({
      success: false,
      error: 'ID de línea inválido. Debe ser L1 o L2'
    });
  }
  
  const stations = lineId === 'L1' ? metroData.metroLinea1Stations : metroData.metroLinea2Stations;
  
  // Transformar las estaciones al formato deseado
  const stationList = Object.entries(stations).map(([id, station]) => ({
    id,
    name: station.name || id,
    coordinates: {
      latitude: station.latitude,
      longitude: station.longitude
    }
  }));
  
  res.json({
    success: true,
    data: stationList
  });
});

/**
 * @swagger
 * /api/mobile/metro/vehicles:
 *   get:
 *     summary: Obtiene todos los vagones del metro en simulación
 *     tags: [Mobile API]
 */
router.get('/metro/vehicles', (req, res) => {
  try {
    // Usar la variable global de vehículos
    const vehicles = global.metroVehicles || [];
    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener vehículos',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/mobile/metro/vehicles/{vehicleId}:
 *   get:
 *     summary: Obtiene información de un vagón específico
 *     tags: [Mobile API]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/metro/vehicles/:vehicleId', (req, res) => {
  try {
    const { vehicleId } = req.params;
    // Usar la variable global de vehículos
    const vehicles = global.metroVehicles || [];
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vagón no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener información del vagón',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/mobile/socket-info:
 *   get:
 *     summary: Obtiene información de configuración de WebSockets
 *     tags: [Mobile API]
 */
router.get('/socket-info', (req, res) => {
  // Obtener la URL base del servidor actual
  const protocol = req.protocol;
  const host = req.get('host');
  
  res.json({
    success: true,
    data: {
      socketUrl: `${protocol}://${host}`,
      events: {
        vehicleUpdate: 'vehicle:update',
        routeVehicles: 'route:vehicles'
      },
      actions: {
        followVehicle: 'passenger:follow-vehicle',
        followRoute: 'passenger:follow-route',
        sendLocation: 'driver:location'
      }
    }
  });
});

module.exports = router; 