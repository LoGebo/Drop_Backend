const express = require('express');
const routesController = require('./routesController');
const vehiclesController = require('./vehiclesController');
const tripPlannerController = require('./tripPlannerController');

const router = express.Router();

// Rutas para vehículos
router.get('/vehicles', vehiclesController.getAllVehicles);
router.get('/vehicles/type/:vehicleType', vehiclesController.getVehiclesByType);
router.get('/vehicles/route/:routeId', vehiclesController.getVehiclesByRoute);
router.get('/vehicles/:vehicleId', vehiclesController.getVehicleById);
router.post('/vehicles/:vehicleId/location', vehiclesController.updateVehicleLocation);

// Rutas para rutas de transporte
router.get('/routes', routesController.getAllRoutes);
router.get('/routes/:routeId', routesController.getRouteById);
router.get('/routes/:routeId/vehicles', routesController.getRouteVehicles);
router.post('/routes', routesController.createRoute);
router.post('/routes/suggest', routesController.suggestRoute);

// Ruta para planificador de viajes
router.post('/trips/plan', tripPlannerController.planTrip);

module.exports = router; 