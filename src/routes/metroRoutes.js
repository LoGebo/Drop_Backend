const express = require('express');
const router = express.Router();
const metroData = require('../data/metroRoutes');
const metroSimulation = require('../utils/metroSimulation');

/**
 * @swagger
 * /api/metro/stations/{lineId}:
 *   get:
 *     summary: Obtener estaciones de una línea de metro
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [L1, L2]
 *         description: ID de la línea de metro (L1 o L2)
 *     responses:
 *       200:
 *         description: Lista de estaciones de la línea de metro
 *       404:
 *         description: Línea de metro no encontrada
 */
router.get('/stations/:lineId', (req, res) => {
  const { lineId } = req.params;
  
  if (lineId !== 'L1' && lineId !== 'L2') {
    return res.status(404).json({ 
      success: false, 
      message: 'Línea de metro no encontrada' 
    });
  }
  
  const stations = lineId === 'L1' ? metroData.metroLinea1Stations : metroData.metroLinea2Stations;
  
  // Convertir el objeto de estaciones a un array
  const stationsArray = Object.entries(stations).map(([name, data]) => ({
    name,
    index: data.index,
    coordinates: data.coordinates
  }));
  
  // Ordenar por índice
  stationsArray.sort((a, b) => a.index - b.index);
  
  res.json({
    success: true,
    data: stationsArray
  });
});

/**
 * @swagger
 * /api/metro/lines/{lineId}:
 *   get:
 *     summary: Obtener todos los puntos de una línea de metro
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [L1, L2]
 *         description: ID de la línea de metro (L1 o L2)
 *     responses:
 *       200:
 *         description: Lista de puntos de la línea de metro
 *       404:
 *         description: Línea de metro no encontrada
 */
router.get('/lines/:lineId', (req, res) => {
  const { lineId } = req.params;
  
  if (lineId !== 'L1' && lineId !== 'L2') {
    return res.status(404).json({ 
      success: false, 
      message: 'Línea de metro no encontrada' 
    });
  }
  
  const line = lineId === 'L1' ? metroData.metroLinea1 : metroData.metroLinea2;
  
  // Simplificar para reducir el tamaño de la respuesta
  const simplifiedLine = line.map(point => ({
    latitude: point.latitude,
    longitude: point.longitude
  }));
  
  res.json({
    success: true,
    data: {
      lineId,
      points: simplifiedLine
    }
  });
});

/**
 * @swagger
 * /api/metro/nearest-station:
 *   get:
 *     summary: Encontrar la estación de metro más cercana a unas coordenadas
 *     tags: [Metro]
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
 *         name: lineId
 *         required: false
 *         schema:
 *           type: string
 *           enum: [L1, L2]
 *     responses:
 *       200:
 *         description: Estación de metro más cercana
 *       400:
 *         description: Parámetros inválidos
 */
router.get('/nearest-station', (req, res) => {
  const { latitude, longitude, lineId } = req.query;
  
  if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
    return res.status(400).json({ 
      success: false, 
      message: 'Coordenadas inválidas' 
    });
  }
  
  const line = lineId === 'L2' ? 'METRO_L2' : 'METRO_L1';
  const nearestStation = metroData.findNearestStation(
    parseFloat(latitude), 
    parseFloat(longitude),
    line
  );
  
  res.json({
    success: true,
    data: {
      name: nearestStation.name,
      coordinates: nearestStation.station.coordinates,
      distance: nearestStation.distance
    }
  });
});

/**
 * @swagger
 * /api/metro/vehicles:
 *   get:
 *     summary: Obtener todos los vagones del metro activos
 *     tags: [Metro]
 *     responses:
 *       200:
 *         description: Lista de vagones de metro activos
 */
router.get('/vehicles', (req, res) => {
  try {
    const vehicles = metroSimulation.getAllVehicles();
    
    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos'
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/{vehicleId}:
 *   get:
 *     summary: Obtener información de un vagón específico
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Información del vagón
 *       404:
 *         description: Vagón no encontrado
 */
router.get('/vehicles/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;
  
  try {
    const vehicle = metroSimulation.getVehicle(vehicleId);
    
    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/add-between-stations:
 *   post:
 *     summary: Añadir un nuevo vagón entre dos estaciones
 *     tags: [Metro]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lineId
 *               - startStation
 *               - endStation
 *               - speed
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: ID del vagón (opcional, se generará uno si no se proporciona)
 *               lineId:
 *                 type: string
 *                 enum: [L1, L2]
 *                 description: ID de la línea de metro
 *               startStation:
 *                 type: string
 *                 description: Nombre de la estación de inicio
 *               endStation:
 *                 type: string
 *                 description: Nombre de la estación de destino
 *               speed:
 *                 type: number
 *                 description: Velocidad en km/h
 *               directionForward:
 *                 type: boolean
 *                 description: Dirección del vagón (true = hacia adelante, false = hacia atrás)
 *     responses:
 *       201:
 *         description: Vagón añadido correctamente
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Estación no encontrada
 */
router.post('/vehicles/add-between-stations', (req, res) => {
  const { vehicleId, lineId, startStation, endStation, speed, directionForward = true } = req.body;
  
  // Validar datos
  if (!lineId || !startStation || !endStation || !speed) {
    return res.status(400).json({
      success: false,
      message: 'Datos incompletos. Se requiere lineId, startStation, endStation y speed.'
    });
  }
  
  if (isNaN(parseFloat(speed)) || parseFloat(speed) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'La velocidad debe ser un número positivo.'
    });
  }
  
  try {
    // Generar ID para el vagón si no se proporciona
    const newVehicleId = vehicleId || `metro_${lineId}_${Date.now()}`;
    
    // Añadir vehículo a la simulación
    const newVehicle = metroSimulation.addVehicleBetweenStations(
      newVehicleId,
      lineId,
      startStation,
      endStation,
      parseFloat(speed),
      directionForward
    );
    
    res.status(201).json({
      success: true,
      data: newVehicle
    });
  } catch (error) {
    console.error('Error al añadir vehículo:', error);
    
    if (error.message.includes('no encontrad')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/add-at-position:
 *   post:
 *     summary: Añadir un nuevo vagón en una posición específica
 *     tags: [Metro]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lineId
 *               - position
 *               - speed
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: ID del vagón (opcional, se generará uno si no se proporciona)
 *               lineId:
 *                 type: string
 *                 enum: [L1, L2]
 *                 description: ID de la línea de metro
 *               position:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               speed:
 *                 type: number
 *                 description: Velocidad en km/h
 *               directionForward:
 *                 type: boolean
 *                 description: Dirección del vagón (true = hacia adelante, false = hacia atrás)
 *     responses:
 *       201:
 *         description: Vagón añadido correctamente
 *       400:
 *         description: Parámetros inválidos
 */
router.post('/vehicles/add-at-position', (req, res) => {
  const { vehicleId, lineId, position, speed, directionForward = true } = req.body;
  
  // Validar datos
  if (!lineId || !position || !position.latitude || !position.longitude || !speed) {
    return res.status(400).json({
      success: false,
      message: 'Datos incompletos. Se requiere lineId, position (latitude, longitude) y speed.'
    });
  }
  
  if (isNaN(parseFloat(speed)) || parseFloat(speed) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'La velocidad debe ser un número positivo.'
    });
  }
  
  try {
    // Generar ID para el vagón si no se proporciona
    const newVehicleId = vehicleId || `metro_${lineId}_${Date.now()}`;
    
    // Añadir vehículo a la simulación
    const newVehicle = metroSimulation.addVehicleAtPosition(
      newVehicleId,
      lineId,
      position,
      parseFloat(speed),
      directionForward
    );
    
    res.status(201).json({
      success: true,
      data: newVehicle
    });
  } catch (error) {
    console.error('Error al añadir vehículo:', error);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/{vehicleId}/speed:
 *   put:
 *     summary: Cambiar la velocidad de un vagón
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - speed
 *             properties:
 *               speed:
 *                 type: number
 *                 description: Nueva velocidad en km/h
 *     responses:
 *       200:
 *         description: Velocidad actualizada correctamente
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Vagón no encontrado
 */
router.put('/vehicles/:vehicleId/speed', (req, res) => {
  const { vehicleId } = req.params;
  const { speed } = req.body;
  
  if (!speed || isNaN(parseFloat(speed)) || parseFloat(speed) < 0) {
    return res.status(400).json({
      success: false,
      message: 'La velocidad debe ser un número positivo.'
    });
  }
  
  try {
    const updatedVehicle = metroSimulation.changeVehicleSpeed(vehicleId, parseFloat(speed));
    
    res.json({
      success: true,
      data: updatedVehicle
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/{vehicleId}/stop:
 *   put:
 *     summary: Detener un vagón
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vagón detenido correctamente
 *       404:
 *         description: Vagón no encontrado
 */
router.put('/vehicles/:vehicleId/stop', (req, res) => {
  const { vehicleId } = req.params;
  
  try {
    const stoppedVehicle = metroSimulation.stopVehicle(vehicleId);
    
    res.json({
      success: true,
      data: stoppedVehicle
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/{vehicleId}/resume:
 *   put:
 *     summary: Reanudar un vagón detenido
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vagón reanudado correctamente
 *       404:
 *         description: Vagón no encontrado
 */
router.put('/vehicles/:vehicleId/resume', (req, res) => {
  const { vehicleId } = req.params;
  
  try {
    const resumedVehicle = metroSimulation.resumeVehicle(vehicleId);
    
    res.json({
      success: true,
      data: resumedVehicle
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/metro/vehicles/{vehicleId}:
 *   delete:
 *     summary: Eliminar un vagón
 *     tags: [Metro]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vagón eliminado correctamente
 *       404:
 *         description: Vagón no encontrado
 */
router.delete('/vehicles/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;
  
  try {
    const removedVehicle = metroSimulation.removeVehicle(vehicleId);
    
    res.json({
      success: true,
      data: removedVehicle
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 