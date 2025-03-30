const { redisClient } = require('../config/redis');

/**
 * Planificar un viaje en transporte público
 * @route POST /api/trips/plan
 */
const planTrip = async (req, res) => {
  try {
    const { origin, destination, preferences } = req.body;
    
    // Validar datos de entrada
    if (!origin || !destination || !origin.latitude || !origin.longitude || 
        !destination.latitude || !destination.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren coordenadas de origen y destino completas'
      });
    }
    
    // Preferencias del usuario (opcionales)
    const userPreferences = {
      maxWalkingDistance: preferences?.maxWalkingDistance || 1000, // metros
      prioritizeLowOccupancy: preferences?.prioritizeLowOccupancy || false,
      prioritizeLowCost: preferences?.prioritizeLowCost || false,
      prioritizeFastRoute: preferences?.prioritizeFastRoute || true,
      maxTransfers: preferences?.maxTransfers || 3,
      transportTypes: preferences?.transportTypes || ['BUS', 'TRAIN', 'METRO', 'WALK']
    };
    
    // Planificar viaje usando nuestro algoritmo
    const tripPlan = await calculateOptimalTrip(origin, destination, userPreferences);
    
    return res.status(200).json({
      success: true,
      trip: tripPlan
    });
  } catch (error) {
    console.error('Error en la planificación de viaje:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al planificar el viaje'
    });
  }
};

/**
 * Encontrar paradas cercanas a una ubicación dada
 * @param {Object} location - Coordenadas de ubicación
 * @param {number} radius - Radio de búsqueda en metros
 * @returns {Array} - Paradas encontradas
 */
async function findNearbyStops(location, radius = 800) {
  try {
    // Obtener todas las rutas
    const routeKeys = await redisClient.keys('route:*');
    const nearbyStops = [];
    
    for (const routeKey of routeKeys) {
      const routeData = await redisClient.get(routeKey);
      if (routeData) {
        const route = JSON.parse(routeData);
        
        // Verificar cada parada de la ruta
        if (route.stops && Array.isArray(route.stops)) {
          for (const stop of route.stops) {
            if (stop.coordinates && stop.coordinates.latitude && stop.coordinates.longitude) {
              // Calcular distancia entre la ubicación y la parada
              const distance = calculateDistance(
                location.latitude, location.longitude,
                stop.coordinates.latitude, stop.coordinates.longitude
              );
              
              // Si está dentro del radio, agregar a la lista
              if (distance <= radius) {
                nearbyStops.push({
                  ...stop,
                  routeId: route.id,
                  routeName: route.name,
                  routeType: route.type,
                  distance: distance
                });
              }
            }
          }
        }
      }
    }
    
    // Ordenar por distancia
    return nearbyStops.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error buscando paradas cercanas:', error);
    return [];
  }
}

/**
 * Calcular la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} - Distancia en metros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance; // Distancia en metros
}

/**
 * Obtener vehículos en una ruta específica
 * @param {string} routeId - ID de la ruta
 * @returns {Array} - Vehículos en la ruta
 */
async function getVehiclesInRoute(routeId) {
  try {
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
    
    return vehicles;
  } catch (error) {
    console.error('Error obteniendo vehículos de la ruta:', error);
    return [];
  }
}

/**
 * Construir un grafo de transporte para el cálculo de rutas
 * @param {Array} originStops - Paradas cercanas al origen
 * @param {Array} destinationStops - Paradas cercanas al destino
 * @returns {Object} - Grafo de transporte
 */
async function buildTransportGraph(originStops, destinationStops) {
  try {
    // Obtener todas las rutas
    const routeKeys = await redisClient.keys('route:*');
    const routes = [];
    
    for (const routeKey of routeKeys) {
      const routeData = await redisClient.get(routeKey);
      if (routeData) {
        routes.push(JSON.parse(routeData));
      }
    }
    
    // Construir el grafo
    const graph = {
      nodes: {},
      edges: []
    };
    
    // Agregar nodos de origen y destino
    const originNode = {
      id: 'ORIGIN',
      type: 'VIRTUAL',
      coordinates: {
        latitude: originStops[0]?.coordinates?.latitude || 0,
        longitude: originStops[0]?.coordinates?.longitude || 0
      }
    };
    
    const destNode = {
      id: 'DESTINATION',
      type: 'VIRTUAL',
      coordinates: {
        latitude: destinationStops[0]?.coordinates?.latitude || 0,
        longitude: destinationStops[0]?.coordinates?.longitude || 0
      }
    };
    
    graph.nodes['ORIGIN'] = originNode;
    graph.nodes['DESTINATION'] = destNode;
    
    // Agregar todas las paradas de todas las rutas como nodos
    for (const route of routes) {
      if (route.stops && Array.isArray(route.stops)) {
        for (const stop of route.stops) {
          const nodeId = `${stop.id}_${route.id}`;
          if (!graph.nodes[nodeId]) {
            graph.nodes[nodeId] = {
              id: nodeId,
              stopId: stop.id,
              stopName: stop.name,
              routeId: route.id,
              routeName: route.name,
              routeType: route.type,
              coordinates: stop.coordinates
            };
          }
        }
      }
    }
    
    // Agregar conexiones entre paradas de la misma ruta
    for (const route of routes) {
      if (route.stops && Array.isArray(route.stops) && route.stops.length > 1) {
        for (let i = 0; i < route.stops.length - 1; i++) {
          const currentStop = route.stops[i];
          const nextStop = route.stops[i + 1];
          
          const fromNodeId = `${currentStop.id}_${route.id}`;
          const toNodeId = `${nextStop.id}_${route.id}`;
          
          const distance = calculateDistance(
            currentStop.coordinates.latitude, currentStop.coordinates.longitude,
            nextStop.coordinates.latitude, nextStop.coordinates.longitude
          );
          
          // Estimar tiempo basado en la distancia y tipo de transporte
          const timeMinutes = estimateTravelTime(distance, route.type);
          const cost = route.basePrice || calculateBaseFare(route.type);
          
          // Obtener vehículos en la ruta para verificar ocupación
          const routeVehicles = await getVehiclesInRoute(route.id);
          const avgOccupancy = routeVehicles.length > 0 
            ? routeVehicles.reduce((sum, v) => sum + (v.occupancy || 0), 0) / routeVehicles.length 
            : 50; // Valor por defecto
          
          graph.edges.push({
            from: fromNodeId,
            to: toNodeId,
            type: route.type,
            routeId: route.id,
            distance: distance,
            time: timeMinutes,
            cost: cost,
            occupancy: avgOccupancy
          });
        }
      }
    }
    
    // Agregar conexiones de transbordo entre paradas de diferentes rutas
    for (const route1 of routes) {
      for (const stop1 of route1.stops || []) {
        for (const route2 of routes) {
          // No crear transbordos dentro de la misma ruta
          if (route1.id === route2.id) continue;
          
          for (const stop2 of route2.stops || []) {
            // Si las paradas tienen el mismo ID o están muy cercanas
            if (stop1.id === stop2.id || 
                (stop1.coordinates && stop2.coordinates && 
                 calculateDistance(
                   stop1.coordinates.latitude, stop1.coordinates.longitude,
                   stop2.coordinates.latitude, stop2.coordinates.longitude
                 ) < 200)) { // Menos de 200 metros
              
              const fromNodeId = `${stop1.id}_${route1.id}`;
              const toNodeId = `${stop2.id}_${route2.id}`;
              
              // Estimar tiempo de transbordo (5 minutos por defecto)
              const transferTime = 5;
              
              graph.edges.push({
                from: fromNodeId,
                to: toNodeId,
                type: 'TRANSFER',
                distance: 0,
                time: transferTime,
                cost: 0
              });
            }
          }
        }
      }
    }
    
    // Conectar nodo origen con paradas cercanas (caminando)
    for (const stop of originStops) {
      const nodeId = `${stop.id}_${stop.routeId}`;
      if (graph.nodes[nodeId]) {
        const walkDistance = stop.distance;
        const walkTime = estimateTravelTime(walkDistance, 'WALK');
        
        graph.edges.push({
          from: 'ORIGIN',
          to: nodeId,
          type: 'WALK',
          distance: walkDistance,
          time: walkTime,
          cost: 0
        });
      }
    }
    
    // Conectar paradas cercanas al destino con nodo destino (caminando)
    for (const stop of destinationStops) {
      const nodeId = `${stop.id}_${stop.routeId}`;
      if (graph.nodes[nodeId]) {
        const walkDistance = stop.distance;
        const walkTime = estimateTravelTime(walkDistance, 'WALK');
        
        graph.edges.push({
          from: nodeId,
          to: 'DESTINATION',
          type: 'WALK',
          distance: walkDistance,
          time: walkTime,
          cost: 0
        });
      }
    }
    
    return graph;
  } catch (error) {
    console.error('Error construyendo grafo de transporte:', error);
    return { nodes: {}, edges: [] };
  }
}

/**
 * Estimar tiempo de viaje basado en distancia y tipo de transporte
 * @param {number} distance - Distancia en metros
 * @param {string} transportType - Tipo de transporte
 * @returns {number} - Tiempo estimado en minutos
 */
function estimateTravelTime(distance, transportType) {
  // Velocidades promedio en metros/minuto
  const speeds = {
    'WALK': 80,       // 4.8 km/h
    'BUS': 400,       // 24 km/h
    'MINIBUS': 350,   // 21 km/h
    'TRAIN': 800,     // 48 km/h
    'METRO': 600,     // 36 km/h
    'PREMIUM_BUS': 450 // 27 km/h
  };
  
  const speed = speeds[transportType] || speeds['BUS'];
  return Math.ceil(distance / speed);
}

/**
 * Calcular tarifa base según tipo de transporte
 * @param {string} transportType - Tipo de transporte
 * @returns {number} - Tarifa base
 */
function calculateBaseFare(transportType) {
  const fares = {
    'WALK': 0,
    'BUS': 12.00,
    'MINIBUS': 10.00,
    'TRAIN': 20.00,
    'METRO': 15.00,
    'PREMIUM_BUS': 35.00
  };
  
  return fares[transportType] || 12.00;
}

/**
 * Calcular la ruta óptima utilizando un algoritmo de Dijkstra multicriterio
 * @param {Object} graph - Grafo de transporte
 * @param {string} startNodeId - ID del nodo inicial
 * @param {string} endNodeId - ID del nodo final
 * @param {Object} preferences - Preferencias del usuario
 * @returns {Object} - Ruta óptima
 */
function findOptimalRoute(graph, startNodeId, endNodeId, preferences) {
  // Inicializar datos
  const visited = new Set();
  const distances = {};
  const previous = {};
  const paths = {};
  
  // Factores de ponderación según preferencias
  const weights = {
    time: preferences.prioritizeFastRoute ? 3 : 1,
    cost: preferences.prioritizeLowCost ? 3 : 1,
    occupancy: preferences.prioritizeLowOccupancy ? 3 : 1,
    transfers: 1
  };
  
  // Establecer valores iniciales
  for (const nodeId in graph.nodes) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    paths[nodeId] = {
      totalTime: Infinity,
      totalCost: Infinity,
      totalDistance: Infinity,
      segments: [],
      transfers: 0
    };
  }
  
  distances[startNodeId] = 0;
  paths[startNodeId] = {
    totalTime: 0,
    totalCost: 0,
    totalDistance: 0,
    segments: [],
    transfers: 0
  };
  
  while (visited.size < Object.keys(graph.nodes).length) {
    // Encontrar el nodo con la menor distancia
    let minDistance = Infinity;
    let currentNodeId = null;
    
    for (const nodeId in distances) {
      if (!visited.has(nodeId) && distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }
    
    // Si no hay más nodos por visitar o ya llegamos al destino
    if (currentNodeId === null || currentNodeId === endNodeId) {
      break;
    }
    
    visited.add(currentNodeId);
    
    // Obtener las aristas que salen del nodo actual
    const outgoingEdges = graph.edges.filter(edge => edge.from === currentNodeId);
    
    for (const edge of outgoingEdges) {
      const neighborId = edge.to;
      
      // Evitar revisitar nodos
      if (visited.has(neighborId)) {
        continue;
      }
      
      // Verificar si el tipo de transporte está permitido
      if (!preferences.transportTypes.includes(edge.type)) {
        continue;
      }
      
      // Si es una caminata, verificar que no exceda la distancia máxima
      if (edge.type === 'WALK' && edge.distance > preferences.maxWalkingDistance) {
        continue;
      }
      
      // Calcular penalización por transbordos
      let transferPenalty = 0;
      const currentPath = paths[currentNodeId];
      const currentSegment = currentPath.segments.length > 0 
        ? currentPath.segments[currentPath.segments.length - 1] 
        : null;
      
      if (currentSegment && currentSegment.type !== edge.type && edge.type !== 'TRANSFER' && currentSegment.type !== 'TRANSFER') {
        transferPenalty = 5; // Penalización de 5 unidades por cada transbordo
        
        // Verificar si excede el número máximo de transbordos
        if (currentPath.transfers >= preferences.maxTransfers) {
          continue;
        }
      }
      
      // Calcular costos combinados
      const newTime = currentPath.totalTime + edge.time + (edge.type === 'TRANSFER' ? 0 : transferPenalty);
      const newCost = currentPath.totalCost + edge.cost;
      const newDistance = currentPath.totalDistance + edge.distance;
      const newTransfers = currentPath.transfers + (transferPenalty > 0 ? 1 : 0);
      
      // Calcular puntaje combinado (menor es mejor)
      const occupancyFactor = edge.occupancy ? (edge.occupancy / 100) : 0;
      const combinedScore = 
        (newTime * weights.time) + 
        (newCost * weights.cost) + 
        (occupancyFactor * weights.occupancy * 30) + // Factor de ocupación
        (newTransfers * weights.transfers * 10);     // Factor de transbordos
      
      if (combinedScore < distances[neighborId]) {
        distances[neighborId] = combinedScore;
        previous[neighborId] = currentNodeId;
        
        // Crear un nuevo segmento para el camino
        const newSegment = {
          from: currentNodeId,
          to: neighborId,
          type: edge.type,
          routeId: edge.routeId,
          time: edge.time,
          cost: edge.cost,
          distance: edge.distance
        };
        
        // Actualizar información del camino
        paths[neighborId] = {
          totalTime: newTime,
          totalCost: newCost,
          totalDistance: newDistance,
          segments: [...currentPath.segments, newSegment],
          transfers: newTransfers
        };
      }
    }
  }
  
  // Reconstruir la ruta óptima
  if (!paths[endNodeId] || paths[endNodeId].totalTime === Infinity) {
    return {
      found: false,
      message: "No se encontró una ruta viable"
    };
  }
  
  // Consolidar segmentos del mismo tipo/ruta consecutivos
  const consolidatedSegments = [];
  let currentConsolidatedSegment = null;
  
  for (const segment of paths[endNodeId].segments) {
    if (!currentConsolidatedSegment) {
      currentConsolidatedSegment = { ...segment };
    } else if (
      currentConsolidatedSegment.type === segment.type && 
      currentConsolidatedSegment.routeId === segment.routeId
    ) {
      // Extender el segmento actual
      currentConsolidatedSegment.to = segment.to;
      currentConsolidatedSegment.time += segment.time;
      currentConsolidatedSegment.cost += segment.cost;
      currentConsolidatedSegment.distance += segment.distance;
    } else {
      // Guardar el segmento consolidado anterior y empezar uno nuevo
      consolidatedSegments.push(currentConsolidatedSegment);
      currentConsolidatedSegment = { ...segment };
    }
  }
  
  // Añadir el último segmento
  if (currentConsolidatedSegment) {
    consolidatedSegments.push(currentConsolidatedSegment);
  }
  
  // Formatear los segmentos para la respuesta
  const formattedSegments = consolidatedSegments.map(segment => {
    const fromNode = graph.nodes[segment.from];
    const toNode = graph.nodes[segment.to];
    
    let description = '';
    if (segment.type === 'WALK') {
      description = `Caminar ${(segment.distance / 1000).toFixed(1)} km hacia ${toNode.stopName || 'destino'}`;
    } else if (segment.type === 'TRANSFER') {
      description = `Transbordar hacia ${toNode.routeName || 'otra ruta'}`;
    } else {
      description = `Tomar ${segment.type} ${segment.routeId} hacia ${toNode.stopName || 'destino'}`;
    }
    
    return {
      type: segment.type,
      routeId: segment.routeId,
      routeName: segment.type !== 'WALK' && segment.type !== 'TRANSFER' ? 
                 (fromNode?.routeName || toNode?.routeName || 'Unknown') : null,
      from: fromNode?.stopName || 'Origen',
      to: toNode?.stopName || 'Destino',
      time: segment.time,
      distance: segment.distance,
      cost: segment.cost,
      description: description
    };
  });
  
  return {
    found: true,
    totalTime: paths[endNodeId].totalTime,
    totalCost: paths[endNodeId].totalCost,
    totalDistance: paths[endNodeId].totalDistance,
    segments: formattedSegments,
    transfers: paths[endNodeId].transfers
  };
}

/**
 * Calcular la ruta óptima combinando diferentes transportes
 * @param {Object} origin - Coordenadas de origen
 * @param {Object} destination - Coordenadas de destino
 * @param {Object} preferences - Preferencias del usuario
 * @returns {Object} - Plan del viaje
 */
async function calculateOptimalTrip(origin, destination, preferences) {
  try {
    // 1. Encontrar paradas cercanas al origen y destino
    const nearbyStopsOrigin = await findNearbyStops(origin, 800); // 800m radio
    const nearbyStopsDestination = await findNearbyStops(destination, 800);
    
    if (nearbyStopsOrigin.length === 0 || nearbyStopsDestination.length === 0) {
      return {
        success: false,
        message: "No se encontraron paradas cercanas al origen o destino"
      };
    }
    
    // 2. Construir grafo de transporte
    const transportGraph = await buildTransportGraph(nearbyStopsOrigin, nearbyStopsDestination);
    
    // 3. Calcular ruta óptima
    const optimalRoute = findOptimalRoute(transportGraph, 'ORIGIN', 'DESTINATION', preferences);
    
    if (!optimalRoute.found) {
      return {
        success: false,
        message: "No se pudo encontrar una ruta válida entre el origen y el destino"
      };
    }
    
    // 4. Formatear resultado
    return {
      success: true,
      origin: {
        latitude: origin.latitude,
        longitude: origin.longitude,
        nearbyStops: nearbyStopsOrigin.slice(0, 3).map(stop => ({
          id: stop.id,
          name: stop.name,
          distance: Math.round(stop.distance),
          routeId: stop.routeId,
          routeName: stop.routeName
        }))
      },
      destination: {
        latitude: destination.latitude,
        longitude: destination.longitude,
        nearbyStops: nearbyStopsDestination.slice(0, 3).map(stop => ({
          id: stop.id,
          name: stop.name,
          distance: Math.round(stop.distance),
          routeId: stop.routeId,
          routeName: stop.routeName
        }))
      },
      route: {
        totalTime: optimalRoute.totalTime,
        totalCost: optimalRoute.totalCost,
        totalDistance: Math.round(optimalRoute.totalDistance),
        transfers: optimalRoute.transfers,
        segments: optimalRoute.segments
      }
    };
  } catch (error) {
    console.error('Error calculando ruta óptima:', error);
    return {
      success: false,
      message: `Error en el cálculo de ruta: ${error.message}`
    };
  }
}

module.exports = {
  planTrip
}; 