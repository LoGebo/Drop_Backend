/**
 * Sistema de simulación para el movimiento de vagones del metro en tiempo real
 * Este módulo gestiona la posición, velocidad y estado de los vagones
 */

const metroData = require('../data/metroRoutes');

class MetroSimulation {
  constructor() {
    this.vehicles = new Map(); // Mapa de vehículos por ID
    this.lastUpdate = Date.now();
    this.started = false;
    
    // Iniciar intervalo de actualización
    this.startSimulation();
  }
  
  /**
   * Iniciar la simulación
   */
  startSimulation() {
    if (this.started) return;
    
    this.interval = setInterval(() => this.updatePositions(), 1000);
    this.started = true;
    console.log('Simulación de metro iniciada');
  }
  
  /**
   * Detener la simulación
   */
  stopSimulation() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.started = false;
      console.log('Simulación de metro detenida');
    }
  }
  
  /**
   * Añadir un vehículo a la simulación entre dos estaciones
   * @param {String} vehicleId - ID único del vehículo
   * @param {String} lineId - ID de la línea (L1, L2)
   * @param {String} startStation - Nombre de la estación de inicio
   * @param {String} endStation - Nombre de la estación de destino
   * @param {Number} speed - Velocidad en km/h
   * @param {Boolean} directionForward - Dirección del movimiento
   * @returns {Object} - El vehículo creado
   */
  addVehicleBetweenStations(vehicleId, lineId, startStation, endStation, speed, directionForward = true) {
    // Obtener datos de la línea
    const line = lineId === 'L2' ? 'METRO_L2' : 'METRO_L1';
    const stations = lineId === 'L2' ? metroData.metroLinea2Stations : metroData.metroLinea1Stations;
    
    // Verificar que las estaciones existan
    if (!stations[startStation] || !stations[endStation]) {
      throw new Error('Estaciones no encontradas en la línea especificada');
    }
    
    // Obtener segmento de ruta entre las estaciones
    const routeSegment = metroData.findRouteSegment(line, startStation, endStation);
    
    if (!routeSegment || routeSegment.length === 0) {
      throw new Error('No se pudo encontrar un segmento de ruta entre las estaciones');
    }
    
    // Crear nuevo vehículo
    const vehicle = {
      id: vehicleId,
      lineId,
      currentPosition: { ...routeSegment[0] }, // Posición inicial
      startStation,
      endStation,
      speed: parseFloat(speed),
      status: 'ACTIVE',
      directionForward,
      route: routeSegment,
      routeProgress: 0, // Progreso en el segmento actual (0-1)
      segmentIndex: 0, // Índice del segmento actual en la ruta
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Añadir al mapa de vehículos
    this.vehicles.set(vehicleId, vehicle);
    
    return vehicle;
  }
  
  /**
   * Añadir un vehículo en una posición específica
   * @param {String} vehicleId - ID único del vehículo
   * @param {String} lineId - ID de la línea (L1, L2)
   * @param {Object} position - Coordenadas {latitude, longitude}
   * @param {Number} speed - Velocidad en km/h
   * @param {Boolean} directionForward - Dirección del movimiento
   * @returns {Object} - El vehículo creado
   */
  addVehicleAtPosition(vehicleId, lineId, position, speed, directionForward = true) {
    // Determinar la línea
    const line = lineId === 'L2' ? 'METRO_L2' : 'METRO_L1';
    const route = lineId === 'L2' ? metroData.metroLinea2 : metroData.metroLinea1;
    
    // Encontrar la posición más cercana en la ruta
    const closestPoint = this.findClosestPointToPosition(route, position);
    
    if (!closestPoint) {
      throw new Error('No se pudo encontrar un punto cercano en la ruta');
    }
    
    // Encontrar la estación más cercana
    const nearestStation = metroData.findNearestStation(
      position.latitude,
      position.longitude,
      line
    );
    
    // Crear nuevo vehículo
    const vehicle = {
      id: vehicleId,
      lineId,
      currentPosition: {
        latitude: position.latitude,
        longitude: position.longitude
      },
      nearestStation: nearestStation.name,
      speed: parseFloat(speed),
      status: 'ACTIVE',
      directionForward,
      route,
      routeProgress: closestPoint.progress,
      segmentIndex: closestPoint.segmentIndex,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Añadir al mapa de vehículos
    this.vehicles.set(vehicleId, vehicle);
    
    return vehicle;
  }
  
  /**
   * Encontrar el punto más cercano en una ruta a una posición dada
   * @param {Array} route - Array de puntos de la ruta
   * @param {Object} position - Coordenadas {latitude, longitude}
   * @returns {Object} - Información del punto más cercano
   */
  findClosestPointToPosition(route, position) {
    let minDistance = Infinity;
    let closestSegmentIndex = 0;
    let closestProgress = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      const segStart = route[i];
      const segEnd = route[i + 1];
      
      // Calcular distancia perpendicular al segmento
      const result = this.calculateDistanceToSegment(
        position, 
        segStart, 
        segEnd
      );
      
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestSegmentIndex = i;
        closestProgress = result.progress;
      }
    }
    
    return {
      segmentIndex: closestSegmentIndex,
      progress: closestProgress,
      distance: minDistance
    };
  }
  
  /**
   * Calcular distancia de un punto a un segmento
   * @param {Object} point - Punto a evaluar
   * @param {Object} segStart - Inicio del segmento
   * @param {Object} segEnd - Fin del segmento
   * @returns {Object} - Distancia y progreso en el segmento
   */
  calculateDistanceToSegment(point, segStart, segEnd) {
    const x = point.longitude;
    const y = point.latitude;
    const x1 = segStart.longitude;
    const y1 = segStart.latitude;
    const x2 = segEnd.longitude;
    const y2 = segEnd.latitude;
    
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    // Calcular distancia usando Haversine para mayor precisión
    const distance = this.calculateDistance(
      point.latitude, point.longitude,
      yy, xx
    );
    
    return {
      distance,
      progress: param < 0 ? 0 : param > 1 ? 1 : param
    };
  }
  
  /**
   * Cambiar la velocidad de un vehículo
   * @param {String} vehicleId - ID del vehículo
   * @param {Number} newSpeed - Nueva velocidad en km/h
   * @returns {Object} - El vehículo actualizado
   */
  changeVehicleSpeed(vehicleId, newSpeed) {
    const vehicle = this.vehicles.get(vehicleId);
    
    if (!vehicle) {
      throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
    }
    
    vehicle.speed = parseFloat(newSpeed);
    vehicle.updatedAt = new Date();
    
    return vehicle;
  }
  
  /**
   * Detener un vehículo
   * @param {String} vehicleId - ID del vehículo
   * @returns {Object} - El vehículo actualizado
   */
  stopVehicle(vehicleId) {
    const vehicle = this.vehicles.get(vehicleId);
    
    if (!vehicle) {
      throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
    }
    
    vehicle.status = 'STOPPED';
    vehicle.updatedAt = new Date();
    
    return vehicle;
  }
  
  /**
   * Reanudar un vehículo detenido
   * @param {String} vehicleId - ID del vehículo
   * @returns {Object} - El vehículo actualizado
   */
  resumeVehicle(vehicleId) {
    const vehicle = this.vehicles.get(vehicleId);
    
    if (!vehicle) {
      throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
    }
    
    vehicle.status = 'ACTIVE';
    vehicle.updatedAt = new Date();
    
    return vehicle;
  }
  
  /**
   * Eliminar un vehículo
   * @param {String} vehicleId - ID del vehículo
   * @returns {Object} - El vehículo eliminado
   */
  removeVehicle(vehicleId) {
    const vehicle = this.vehicles.get(vehicleId);
    
    if (!vehicle) {
      throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
    }
    
    this.vehicles.delete(vehicleId);
    
    return vehicle;
  }
  
  /**
   * Obtener todos los vehículos activos
   * @returns {Array} - Lista de vehículos
   */
  getAllVehicles() {
    return Array.from(this.vehicles.values());
  }
  
  /**
   * Obtener un vehículo por su ID
   * @param {String} vehicleId - ID del vehículo
   * @returns {Object} - El vehículo
   */
  getVehicle(vehicleId) {
    const vehicle = this.vehicles.get(vehicleId);
    
    if (!vehicle) {
      throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
    }
    
    return vehicle;
  }
  
  /**
   * Actualizar la posición de todos los vehículos activos
   */
  updatePositions() {
    const now = Date.now();
    const timeDiff = (now - this.lastUpdate) / 1000; // Tiempo en segundos
    this.lastUpdate = now;
    
    this.vehicles.forEach(vehicle => {
      if (vehicle.status !== 'ACTIVE') return;
      
      // Convertir velocidad de km/h a metros por segundo
      const speedMps = vehicle.speed * (1000 / 3600);
      
      // Distancia recorrida en este intervalo
      const distanceTraveled = speedMps * timeDiff;
      
      this.updateVehiclePosition(vehicle, distanceTraveled);
    });
  }
  
  /**
   * Actualizar la posición de un vehículo específico
   * @param {Object} vehicle - El vehículo a actualizar
   * @param {Number} distanceTraveled - Distancia recorrida en metros
   */
  updateVehiclePosition(vehicle, distanceTraveled) {
    if (!vehicle.route || vehicle.route.length <= 1) return;
    
    // Obtener segmento actual
    const currentSegment = vehicle.segmentIndex;
    const segmentStart = vehicle.route[currentSegment];
    const segmentEnd = vehicle.route[currentSegment + 1];
    
    if (!segmentStart || !segmentEnd) return;
    
    // Calcular distancia total del segmento
    const segmentDistance = this.calculateDistance(
      segmentStart.latitude, segmentStart.longitude,
      segmentEnd.latitude, segmentEnd.longitude
    );
    
    // Actualizar progreso en el segmento
    const directionMultiplier = vehicle.directionForward ? 1 : -1;
    vehicle.routeProgress += (distanceTraveled / segmentDistance) * directionMultiplier;
    
    // Si completamos el segmento actual, pasar al siguiente
    if (vehicle.routeProgress >= 1) {
      // Calcular progreso excedente
      const excessProgress = vehicle.routeProgress - 1;
      
      // Pasar al siguiente segmento
      vehicle.segmentIndex++;
      vehicle.routeProgress = 0;
      
      // Si llegamos al final de la ruta
      if (vehicle.segmentIndex >= vehicle.route.length - 1) {
        // Si es la última estación, cambiar dirección
        vehicle.directionForward = !vehicle.directionForward;
        
        if (vehicle.directionForward) {
          vehicle.segmentIndex = 0;
        } else {
          vehicle.segmentIndex = vehicle.route.length - 2;
        }
      }
      
      // Aplicar progreso excedente al nuevo segmento
      const nextSegmentStart = vehicle.route[vehicle.segmentIndex];
      const nextSegmentEnd = vehicle.route[vehicle.segmentIndex + 1];
      
      if (nextSegmentStart && nextSegmentEnd) {
        const nextSegmentDistance = this.calculateDistance(
          nextSegmentStart.latitude, nextSegmentStart.longitude,
          nextSegmentEnd.latitude, nextSegmentEnd.longitude
        );
        
        vehicle.routeProgress = excessProgress * segmentDistance / nextSegmentDistance;
      }
    }
    // Si vamos hacia atrás y llegamos al inicio del segmento
    else if (vehicle.routeProgress < 0) {
      // Pasar al segmento anterior
      vehicle.segmentIndex--;
      
      // Si llegamos al inicio de la ruta
      if (vehicle.segmentIndex < 0) {
        // Cambiar dirección
        vehicle.directionForward = !vehicle.directionForward;
        vehicle.segmentIndex = 0;
        vehicle.routeProgress = 0;
      } else {
        // Calcular progreso en el segmento anterior
        const prevSegmentStart = vehicle.route[vehicle.segmentIndex];
        const prevSegmentEnd = vehicle.route[vehicle.segmentIndex + 1];
        
        if (prevSegmentStart && prevSegmentEnd) {
          const prevSegmentDistance = this.calculateDistance(
            prevSegmentStart.latitude, prevSegmentStart.longitude,
            prevSegmentEnd.latitude, prevSegmentEnd.longitude
          );
          
          vehicle.routeProgress = 1 + (vehicle.routeProgress * segmentDistance / prevSegmentDistance);
        } else {
          vehicle.routeProgress = 1;
        }
      }
    }
    
    // Interpolar posición actual en el segmento
    const currentStart = vehicle.route[vehicle.segmentIndex];
    const currentEnd = vehicle.route[vehicle.segmentIndex + 1];
    
    if (currentStart && currentEnd) {
      vehicle.currentPosition = this.interpolatePosition(
        currentStart.latitude, currentStart.longitude,
        currentEnd.latitude, currentEnd.longitude,
        vehicle.routeProgress
      );
      
      // Actualizar estación más cercana
      const nearestStation = metroData.findNearestStation(
        vehicle.currentPosition.latitude,
        vehicle.currentPosition.longitude,
        vehicle.lineId === 'L2' ? 'METRO_L2' : 'METRO_L1'
      );
      
      if (nearestStation) {
        vehicle.nearestStation = nearestStation.name;
      }
    }
    
    // Actualizar timestamp
    vehicle.updatedAt = new Date();
  }
  
  /**
   * Calcular distancia entre dos puntos usando Haversine
   * @param {Number} lat1 - Latitud del primer punto
   * @param {Number} lon1 - Longitud del primer punto
   * @param {Number} lat2 - Latitud del segundo punto
   * @param {Number} lon2 - Longitud del segundo punto
   * @returns {Number} - Distancia en metros
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convertir a metros
  }
  
  /**
   * Interpolar posición entre dos puntos
   * @param {Number} lat1 - Latitud del primer punto
   * @param {Number} lon1 - Longitud del primer punto
   * @param {Number} lat2 - Latitud del segundo punto
   * @param {Number} lon2 - Longitud del segundo punto
   * @param {Number} progress - Progreso entre 0 y 1
   * @returns {Object} - Coordenadas interpoladas
   */
  interpolatePosition(lat1, lon1, lat2, lon2, progress) {
    return {
      latitude: lat1 + (lat2 - lat1) * progress,
      longitude: lon1 + (lon2 - lon1) * progress
    };
  }
}

// Exportar instancia singleton
const metroSimulation = new MetroSimulation();
module.exports = metroSimulation; 