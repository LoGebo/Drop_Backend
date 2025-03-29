const express = require('express');
const { redisClient } = require('../config/redis');
const router = express.Router();

/**
 * Obtener todos los vehículos
 * @route GET /api/vehicles
 */
const getAllVehicles = async (req, res) => {
  try {
    // Buscar todas las claves de vehículos
    const vehicleKeys = await redisClient.keys('vehicle:*');
    
    if (!vehicleKeys || vehicleKeys.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        vehicles: []
      });
    }
    
    // Obtener datos de todos los vehículos
    const vehicles = [];
    for (const key of vehicleKeys) {
      const vehicleData = await redisClient.get(key);
      if (vehicleData) {
        vehicles.push(JSON.parse(vehicleData));
      }
    }
    
    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles
    });
  } catch (error) {
    console.error('Error obteniendo vehículos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos'
    });
  }
};

/**
 * Obtener un vehículo específico por ID
 * @route GET /api/vehicles/:vehicleId
 */
const getVehicleById = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    // Obtener datos del vehículo desde Redis
    const vehicleData = await redisClient.get(`vehicle:${vehicleId}`);
    
    if (!vehicleData) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      vehicle: JSON.parse(vehicleData)
    });
  } catch (error) {
    console.error('Error obteniendo datos del vehículo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos del vehículo'
    });
  }
};

/**
 * Actualizar la ubicación de un vehículo
 * @route POST /api/vehicles/:vehicleId/location
 */
const updateVehicleLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { latitude, longitude, occupancy, occupancyStop, price } = req.body;
    
    // Validar datos
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren latitud y longitud'
      });
    }
    
    // Verificar si el vehículo existe
    const vehicleDataStr = await redisClient.get(`vehicle:${vehicleId}`);
    
    // Si el vehículo no existe, crear uno nuevo
    let vehicleData;
    if (!vehicleDataStr) {
      // Crear un nuevo vehículo con datos básicos
      vehicleData = {
        id: vehicleId,
        type: req.body.type || 'BUS', // Por defecto es un autobús
        route: req.body.route || null,
        status: 'active',
        createdAt: Date.now()
      };
    } else {
      // Usar el vehículo existente
      vehicleData = JSON.parse(vehicleDataStr);
    }
    
    // Actualizar ubicación y otros datos
    vehicleData.location = { latitude, longitude };
    vehicleData.lastUpdate = Date.now();
    
    // Actualizar ocupación si se proporciona
    if (occupancy !== undefined) {
      vehicleData.occupancy = parseInt(occupancy);
    }
    
    // Actualizar ocupación de la parada si se proporciona
    if (occupancyStop !== undefined) {
      vehicleData.occupancyStop = parseInt(occupancyStop);
    }
    
    // Actualizar precio si se proporciona
    if (price !== undefined) {
      vehicleData.price = parseFloat(price);
    }
    
    // Actualizar ruta si se proporciona
    if (req.body.route) {
      vehicleData.route = req.body.route;
    }
    
    // Guardar datos actualizados en Redis
    await redisClient.set(`vehicle:${vehicleId}`, JSON.stringify(vehicleData));
    
    // También publicar la actualización para notificaciones en tiempo real
    await redisClient.publish('vehicle:updates', JSON.stringify(vehicleData));
    
    return res.status(200).json({
      success: true,
      message: 'Ubicación del vehículo actualizada',
      vehicle: vehicleData
    });
  } catch (error) {
    console.error('Error actualizando ubicación del vehículo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar ubicación del vehículo'
    });
  }
};

/**
 * Obtener vehículos por tipo
 * @route GET /api/vehicles/type/:vehicleType
 */
const getVehiclesByType = async (req, res) => {
  try {
    const { vehicleType } = req.params;
    const vehicleKeys = await redisClient.keys('vehicle:*');
    const vehicles = [];
    
    for (const key of vehicleKeys) {
      const vehicleData = await redisClient.get(key);
      if (vehicleData) {
        const vehicle = JSON.parse(vehicleData);
        if (vehicle.type && vehicle.type.toUpperCase() === vehicleType.toUpperCase()) {
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
    console.error('Error obteniendo vehículos por tipo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos por tipo'
    });
  }
};

/**
 * Obtener vehículos por ruta
 * @route GET /api/vehicles/route/:routeId
 */
const getVehiclesByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const vehicleKeys = await redisClient.keys('vehicle:*');
    const vehicles = [];
    
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
    console.error('Error obteniendo vehículos por ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos por ruta'
    });
  }
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  updateVehicleLocation,
  getVehiclesByType,
  getVehiclesByRoute
}; 