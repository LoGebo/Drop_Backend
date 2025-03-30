const express = require('express');
const router = express.Router();
const tripPlannerController = require('./tripPlannerController');

/**
 * Valida que un objeto contenga coordenadas válidas
 * @param {Object} coordinates - Objeto con latitud y longitud
 * @returns {boolean} - True si las coordenadas son válidas
 */
function validateCoordinates(coordinates) {
  if (!coordinates || typeof coordinates !== 'object') {
    return false;
  }
  
  const { latitude, longitude } = coordinates;
  
  // Verificar que existan y puedan convertirse a números
  if (latitude === undefined || longitude === undefined) {
    return false;
  }
  
  // Convertir a números si son strings
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  // Verificar que sean números válidos
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  
  // Verificar que estén dentro de rangos válidos
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  
  return true;
}

/**
 * @swagger
 * /api/trip-planner:
 *   post:
 *     summary: Planificar viaje entre dos puntos usando transporte público
 *     tags: [TripPlanner]
 *     description: Calcula la ruta óptima entre origen y destino utilizando transporte público en Monterrey
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
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               preferences:
 *                 type: object
 *                 properties:
 *                   maxWalkingDistance:
 *                     type: number
 *                     description: Distancia máxima a caminar en metros
 *                     default: 800
 *                   transportTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [BUS, METRO, MINIBUS, WALK]
 *                     default: [BUS, METRO, MINIBUS, WALK]
 *                   prioritizeFastRoute:
 *                     type: boolean
 *                     default: true
 *                   prioritizeLowCost:
 *                     type: boolean
 *                     default: false
 *                   prioritizeLowOccupancy:
 *                     type: boolean
 *                     default: false
 *                   maxTransfers:
 *                     type: number
 *                     default: 2
 *     responses:
 *       200:
 *         description: Ruta óptima encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Parámetros de entrada inválidos
 *       404:
 *         description: No se encontró una ruta
 *       500:
 *         description: Error en el servidor
 */
router.post('/', async (req, res) => {
  try {
    console.log('Recibida solicitud para planificar ruta:', JSON.stringify(req.body, null, 2));
    
    const { origin, destination, preferences = {} } = req.body;
    
    // Validar coordenadas
    if (!validateCoordinates(origin) || !validateCoordinates(destination)) {
      return res.status(400).json({ 
        success: false,
        error: 'Coordenadas inválidas', 
        message: 'Las coordenadas de origen y destino deben ser válidas'
      });
    }
    
    // Asegurarse de que las coordenadas sean números
    const normalizedOrigin = {
      latitude: parseFloat(origin.latitude),
      longitude: parseFloat(origin.longitude)
    };
    
    const normalizedDestination = {
      latitude: parseFloat(destination.latitude),
      longitude: parseFloat(destination.longitude)
    };
    
    // Establecer preferencias por defecto
    const defaultPreferences = {
      maxWalkingDistance: 800, // metros
      transportTypes: ['BUS', 'METRO', 'MINIBUS', 'WALK'],
      prioritizeFastRoute: true,
      prioritizeLowCost: false,
      prioritizeLowOccupancy: false,
      maxTransfers: 2
    };
    
    // Combinar preferencias del usuario con las predeterminadas
    const userPreferences = { ...defaultPreferences, ...preferences };
    
    // Llamar al controlador para planificar el viaje
    const trip = await tripPlannerController.planTrip(normalizedOrigin, normalizedDestination, userPreferences);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada', 
        message: 'No se pudo encontrar una ruta entre los puntos especificados' 
      });
    }
    
    console.log('Ruta encontrada con éxito.');
    res.json({
      success: true,
      message: 'Ruta calculada exitosamente',
      data: trip
    });
  } catch (error) {
    console.error('Error en la planificación de ruta:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error en la planificación', 
      message: error.message || 'Ocurrió un error al planificar la ruta'
    });
  }
});

/**
 * @swagger
 * /api/trip-planner/nearby-stops:
 *   get:
 *     summary: Encontrar paradas cercanas a una ubicación
 *     tags: [TripPlanner]
 *     description: Busca paradas de transporte público cercanas a unas coordenadas específicas
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         description: Radio de búsqueda en metros
 *         required: false
 *         schema:
 *           type: number
 *           default: 800
 *     responses:
 *       200:
 *         description: Lista de paradas cercanas
 *       400:
 *         description: Parámetros de entrada inválidos
 *       500:
 *         description: Error en el servidor
 */
router.get('/nearby-stops', async (req, res) => {
  try {
    const { latitude, longitude, radius = 800 } = req.query;
    
    // Validar parámetros
    if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      return res.status(400).json({ 
        error: 'Parámetros inválidos', 
        message: 'Debe proporcionar coordenadas válidas (latitud y longitud)' 
      });
    }
    
    const location = { 
      latitude: parseFloat(latitude), 
      longitude: parseFloat(longitude) 
    };
    
    // Buscar paradas cercanas
    const nearbyStops = await tripPlannerController.findNearbyStops(location, parseFloat(radius));
    
    res.json({ stops: nearbyStops });
  } catch (error) {
    console.error('Error al buscar paradas cercanas:', error);
    res.status(500).json({ 
      error: 'Error en la búsqueda', 
      message: error.message || 'Ocurrió un error al buscar paradas cercanas'
    });
  }
});

module.exports = router; 