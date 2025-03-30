const metroRoutes = require('../data/metroRoutes');

/**
 * Planificar un viaje entre dos puntos
 * @param {Object} origin - Coordenadas de origen
 * @param {Object} destination - Coordenadas de destino
 * @param {Object} preferences - Preferencias del usuario
 * @returns {Object} - Ruta planificada
 */
async function planTrip(origin, destination, preferences) {
  try {
    console.log('Iniciando planificación de viaje:');
    console.log('- Origen:', origin);
    console.log('- Destino:', destination);
    console.log('- Preferencias:', preferences);

    // Validar parámetros
    if (!origin || !origin.latitude || !origin.longitude) {
      throw new Error('El origen debe tener coordenadas válidas');
    }

    if (!destination || !destination.latitude || !destination.longitude) {
      throw new Error('El destino debe tener coordenadas válidas');
    }

    // Construir grafo de transporte
    const graph = await buildTransportGraph(origin, destination, preferences);
    
    if (!graph || Object.keys(graph.nodes).length === 0) {
      console.log('No se pudo construir el grafo de transporte');
      return null;
    }
    
    console.log(`Grafo construido con ${Object.keys(graph.nodes).length} nodos y ${graph.edges.length} conexiones`);
    
    // Convertir origen y destino a IDs de nodos
    const startNodeId = `origin`;
    const endNodeId = `destination`;
    
    // Encontrar ruta óptima
    const route = findOptimalRoute(graph, startNodeId, endNodeId, preferences);
    
    if (!route) {
      console.log('No se encontró una ruta óptima');
      return null;
    }
    
    // Construir respuesta
    const result = {
      totalTime: route.totalTime,
      totalDistance: route.totalDistance,
      totalCost: route.totalCost,
      transfers: route.transfers,
      segments: route.segments
    };
    
    return result;
  } catch (error) {
    console.error('Error en la planificación de viaje:', error);
    throw error;
  }
}

/**
 * Buscar paradas cercanas a una ubicación
 * @param {Object} location - Coordenadas de la ubicación
 * @param {number} radius - Radio de búsqueda en metros
 * @returns {Array} - Lista de paradas cercanas
 */
async function findNearbyStops(location, radius = 800) {
  try {
    console.log(`Buscando paradas cercanas a (${location.latitude}, ${location.longitude}) en radio ${radius}m`);
    
    // Datos de las paradas de Metro Línea 1 usando las coordenadas exactas
    const metroStops = [
      { id: 'stop_talleres', name: 'Talleres', coordinates: { latitude: 25.75389, longitude: -100.36528 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_san_bernabe', name: 'San Bernabé', coordinates: { latitude: 25.74833, longitude: -100.36167 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_unidad_modelo', name: 'Unidad Modelo', coordinates: { latitude: 25.74194, longitude: -100.35500 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_aztlan', name: 'Aztlán', coordinates: { latitude: 25.7321485, longitude: -100.3472600 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_penitenciaria', name: 'Penitenciaría', coordinates: { latitude: 25.7233152, longitude: -100.3425450 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_alfonso_reyes', name: 'Alfonso Reyes', coordinates: { latitude: 25.71611, longitude: -100.34250 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_mitras', name: 'Mitras', coordinates: { latitude: 25.7059242, longitude: -100.3424003 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_simon_bolivar', name: 'Simón Bolívar', coordinates: { latitude: 25.6987474, longitude: -100.3431880 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_hospital', name: 'Hospital', coordinates: { latitude: 25.69194, longitude: -100.34417 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_edison', name: 'Edison', coordinates: { latitude: 25.68694, longitude: -100.33361 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_central', name: 'Central', coordinates: { latitude: 25.68694, longitude: -100.32444 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_cuauhtemoc', name: 'Cuauhtémoc', coordinates: { latitude: 25.68611, longitude: -100.31694 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_del_golfo', name: 'Del Golfo', coordinates: { latitude: 25.68512, longitude: -100.30663 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_felix_u_gomez', name: 'Félix U. Gómez', coordinates: { latitude: 25.68389, longitude: -100.29667 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_parque_fundidora', name: 'Parque Fundidora', coordinates: { latitude: 25.68361, longitude: -100.28806 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_y_griega', name: 'Y Griega', coordinates: { latitude: 25.6832309, longitude: -100.2794460 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_eloy_cavazos', name: 'Eloy Cavazos', coordinates: { latitude: 25.68000, longitude: -100.26417 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_lerdo_de_tejada', name: 'Lerdo de Tejada', coordinates: { latitude: 25.67972, longitude: -100.25278 }, routes: ['METRO_L1'], type: 'METRO' },
      { id: 'stop_exposicion', name: 'Exposición', coordinates: { latitude: 25.67944, longitude: -100.24556 }, routes: ['METRO_L1'], type: 'METRO' },
      // Estaciones Línea 2 (simplificadas)
      { id: 'stop_general_anaya', name: 'General Anaya', coordinates: { latitude: 25.6730, longitude: -100.3178 }, routes: ['METRO_L2'], type: 'METRO' },
      { id: 'stop_santa_lucia', name: 'Santa Lucía', coordinates: { latitude: 25.6798, longitude: -100.3394 }, routes: ['METRO_L2'], type: 'METRO' },
      // Paradas de autobús
      { id: 'stop_macroplaza', name: 'Macroplaza', coordinates: { latitude: 25.6694, longitude: -100.3098 }, routes: ['ROUTE_1', 'ROUTE_17'], type: 'BUS' },
      { id: 'stop_fundidora_bus', name: 'Parque Fundidora (Bus)', coordinates: { latitude: 25.6791, longitude: -100.2840 }, routes: ['ROUTE_17'], type: 'BUS' },
      { id: 'stop_universidad', name: 'Av. Universidad', coordinates: { latitude: 25.6895, longitude: -100.3163 }, routes: ['ROUTE_1'], type: 'BUS' },
      { id: 'stop_santa_catarina', name: 'Santa Catarina Centro', coordinates: { latitude: 25.6731, longitude: -100.4583 }, routes: ['ROUTE_130'], type: 'BUS' }
    ];
    
    // Obtener también la estación más cercana utilizando metroRoutes
    let nearestMetroStation = null;
    if (metroRoutes && metroRoutes.findNearestStation) {
      nearestMetroStation = metroRoutes.findNearestStation(location.latitude, location.longitude);
      console.log(`La estación de metro más cercana es ${nearestMetroStation.name} a ${nearestMetroStation.distance.toFixed(2)} metros`);
    }
    
    // Filtrar paradas dentro del radio
    const nearbyStops = metroStops.filter(stop => {
      const distance = calculateDistance(
        location.latitude, 
        location.longitude, 
        stop.coordinates.latitude, 
        stop.coordinates.longitude
      );
      
      stop.distance = Math.round(distance); // Añadir distancia en metros
      return distance <= radius;
    });
    
    // Ordenar por distancia
    nearbyStops.sort((a, b) => a.distance - b.distance);
    
    return nearbyStops;
  } catch (error) {
    console.error('Error buscando paradas cercanas:', error);
    return [];
  }
}

/**
 * Calcular la distancia entre dos puntos usando la fórmula Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} - Distancia en metros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distancia en metros
}

/**
 * Construir un grafo de transporte basado en el origen, destino y preferencias
 * @param {Object} origin - Coordenadas de origen
 * @param {Object} destination - Coordenadas de destino
 * @param {Object} preferences - Preferencias del usuario
 * @returns {Object} - Grafo de transporte
 */
async function buildTransportGraph(origin, destination, preferences) {
  try {
    // Inicializar grafo
    const graph = {
      nodes: {},
      edges: [],
      vehicles: {}
    };
    
    // Añadir nodos de origen y destino
    graph.nodes.origin = {
      id: 'origin',
      type: 'USER_LOCATION',
      coordinates: origin
    };
    
    graph.nodes.destination = {
      id: 'destination',
      type: 'USER_LOCATION',
      coordinates: destination
    };
    
    // Obtener paradas cercanas al origen y destino
    const originNearbyStops = await findNearbyStops(origin, preferences.maxWalkingDistance);
    const destNearbyStops = await findNearbyStops(destination, preferences.maxWalkingDistance);
    
    // Si no hay paradas cercanas a algún punto, intentar encontrar la estación de metro más cercana
    if (originNearbyStops.length === 0 && metroRoutes && metroRoutes.findNearestStation) {
      const nearestStation = metroRoutes.findNearestStation(origin.latitude, origin.longitude);
      if (nearestStation && nearestStation.name) {
        const station = metroRoutes.metroLinea1Stations[nearestStation.name];
        if (station) {
          const stopId = `stop_${nearestStation.name.toLowerCase().replace(/\s+/g, '_')}`;
          originNearbyStops.push({
            id: stopId,
            name: nearestStation.name,
            coordinates: station.coordinates,
            routes: ['METRO_L1'],
            type: 'METRO',
            distance: nearestStation.distance
          });
          console.log(`No hay paradas cercanas al origen, usando la estación de metro más cercana: ${nearestStation.name}`);
        }
      }
    }
    
    if (destNearbyStops.length === 0 && metroRoutes && metroRoutes.findNearestStation) {
      const nearestStation = metroRoutes.findNearestStation(destination.latitude, destination.longitude);
      if (nearestStation && nearestStation.name) {
        const station = metroRoutes.metroLinea1Stations[nearestStation.name];
        if (station) {
          const stopId = `stop_${nearestStation.name.toLowerCase().replace(/\s+/g, '_')}`;
          destNearbyStops.push({
            id: stopId,
            name: nearestStation.name,
            coordinates: station.coordinates,
            routes: ['METRO_L1'],
            type: 'METRO',
            distance: nearestStation.distance
          });
          console.log(`No hay paradas cercanas al destino, usando la estación de metro más cercana: ${nearestStation.name}`);
        }
      }
    }
    
    // Guardar las paradas cercanas
    graph.nodes.origin.nearbyStops = originNearbyStops;
    graph.nodes.destination.nearbyStops = destNearbyStops;
    
    // Verificar si hay paradas disponibles
    if (originNearbyStops.length === 0 || destNearbyStops.length === 0) {
      console.log('No hay suficientes paradas cercanas para planificar una ruta');
      return { nodes: {}, edges: [], vehicles: {} };
    }
    
    // Añadir nodos para las paradas
    for (const stop of originNearbyStops) {
      const nodeId = `stop:${stop.id}`;
      graph.nodes[nodeId] = {
        id: nodeId,
        stopId: stop.id,
        type: 'STOP',
        stopType: stop.type,
        name: stop.name,
        routes: stop.routes,
        coordinates: stop.coordinates
      };
      
      // Añadir arista para caminar desde el origen a la parada
      graph.edges.push({
        from: 'origin',
        to: nodeId,
        type: 'WALK',
        distance: stop.distance,
        time: Math.ceil(stop.distance / 83.33), // ~5 km/h en metros/minuto
        cost: 0
      });
    }
    
    for (const stop of destNearbyStops) {
      const nodeId = `stop:${stop.id}`;
      
      // Evitar duplicados si una parada está cerca tanto del origen como del destino
      if (!graph.nodes[nodeId]) {
        graph.nodes[nodeId] = {
          id: nodeId,
          stopId: stop.id,
          type: 'STOP',
          stopType: stop.type,
          name: stop.name,
          routes: stop.routes,
          coordinates: stop.coordinates
        };
      }
      
      // Añadir arista para caminar desde la parada al destino
      graph.edges.push({
        from: nodeId,
        to: 'destination',
        type: 'WALK',
        distance: stop.distance,
        time: Math.ceil(stop.distance / 83.33), // ~5 km/h
        cost: 0
      });
    }
    
    // Obtener rutas de las paradas
    const routes = new Set();
    const stopsMap = {};
    
    // Recopilar todas las rutas y paradas
    for (const stop of [...originNearbyStops, ...destNearbyStops]) {
      const nodeId = `stop:${stop.id}`;
      stopsMap[stop.id] = stop;
      
      for (const routeId of stop.routes) {
        routes.add(routeId);
      }
    }
    
    // Datos de rutas y sus recorridos
    const routeData = {
      'METRO_L1': {
        cost: 5.50,
        type: 'METRO',
        stops: [
          'stop_talleres', 'stop_san_bernabe', 'stop_unidad_modelo', 'stop_aztlan', 
          'stop_penitenciaria', 'stop_alfonso_reyes', 'stop_mitras', 'stop_simon_bolivar', 
          'stop_hospital', 'stop_edison', 'stop_central', 'stop_cuauhtemoc', 
          'stop_del_golfo', 'stop_felix_u_gomez', 'stop_parque_fundidora', 'stop_y_griega', 
          'stop_eloy_cavazos', 'stop_lerdo_de_tejada', 'stop_exposicion'
        ],
        travelTimeBetweenStops: 3, // minutos
        frequency: 4 // cada 4 minutos
      },
      'METRO_L2': {
        cost: 5.50,
        type: 'METRO',
        stops: ['stop_general_anaya', 'stop_santa_lucia'],
        travelTimeBetweenStops: 3,
        frequency: 5
      },
      'ROUTE_1': {
        cost: 12.00,
        type: 'BUS',
        stops: ['stop_macroplaza', 'stop_universidad'],
        travelTimeBetweenStops: 7,
        frequency: 12
      },
      'ROUTE_17': {
        cost: 12.00,
        type: 'BUS',
        stops: ['stop_macroplaza', 'stop_fundidora_bus'],
        travelTimeBetweenStops: 10,
        frequency: 15
      },
      'ROUTE_130': {
        cost: 15.00,
        type: 'BUS',
        stops: ['stop_santa_catarina'],
        travelTimeBetweenStops: 12,
        frequency: 20
      }
    };
    
    // Vehículos en operación (simplificados para este ejemplo)
    const routeVehicles = [
      { id: 'vm1_01', route: 'METRO_L1', type: 'METRO', status: 'IN_SERVICE', coordinates: { latitude: 25.6987474, longitude: -100.3431880 }, speed: 40, onDuty: true, nextStopId: 'stop_simon_bolivar', delay: 0 },
      { id: 'vm1_02', route: 'METRO_L1', type: 'METRO', status: 'IN_SERVICE', coordinates: { latitude: 25.68694, longitude: -100.32444 }, speed: 40, onDuty: true, nextStopId: 'stop_central', delay: 1 },
      { id: 'vm2_01', route: 'METRO_L2', type: 'METRO', status: 'IN_SERVICE', coordinates: { latitude: 25.6798, longitude: -100.3394 }, speed: 40, onDuty: true, nextStopId: 'stop_santa_lucia', delay: 1 },
      { id: 'vr1_01', route: 'ROUTE_1', type: 'BUS', status: 'IN_SERVICE', coordinates: { latitude: 25.6895, longitude: -100.3163 }, speed: 20, onDuty: true, nextStopId: 'stop_universidad', delay: 3 },
      { id: 'vr17_01', route: 'ROUTE_17', type: 'BUS', status: 'IN_SERVICE', coordinates: { latitude: 25.6694, longitude: -100.3098 }, speed: 22, onDuty: true, nextStopId: 'stop_macroplaza', delay: 0 }
    ];
    
    // Añadir aristas entre paradas de la misma ruta
    for (const routeId of routes) {
      const route = routeData[routeId];
      if (!route) continue;
      
      const routeStops = route.stops;
      
      // Crear conexiones entre paradas de la misma ruta (en ambas direcciones)
      for (let i = 0; i < routeStops.length; i++) {
        for (let j = 0; j < routeStops.length; j++) {
          if (i !== j) { // No conectar una parada consigo misma
            const stopA = stopsMap[routeStops[i]];
            const stopB = stopsMap[routeStops[j]];
            
            if (stopA && stopB) {
              const nodeA = `stop:${stopA.id}`;
              const nodeB = `stop:${stopB.id}`;
              
              // Calcular distancia
              const distance = calculateDistance(
                stopA.coordinates.latitude, 
                stopA.coordinates.longitude, 
                stopB.coordinates.latitude, 
                stopB.coordinates.longitude
              );
              
              // Calcular tiempo basado en la distancia y tipo de transporte
              const stopsCount = Math.abs(i - j);
              const time = stopsCount * route.travelTimeBetweenStops;
              
              // Añadir arista para viajar entre las paradas usando esta ruta
              graph.edges.push({
                from: nodeA,
                to: nodeB,
                type: route.type,
                routeId: routeId,
                distance: distance,
                time: time,
                cost: route.cost,
                occupancy: Math.floor(Math.random() * 80) // 0-80% ocupación, aleatorio
              });
            }
          }
        }
      }
    }
    
    // Crear conexiones directas para el metro basadas en el orden real de las estaciones
    if (metroRoutes) {
      const metroStations = metroRoutes.metroLinea1Stations;
      const stationNames = Object.keys(metroStations);
      
      for (let i = 0; i < stationNames.length; i++) {
        const fromStation = stationNames[i];
        const fromStopId = `stop_${fromStation.toLowerCase().replace(/\s+/g, '_')}`;
        
        for (let j = 0; j < stationNames.length; j++) {
          if (i !== j) {
            const toStation = stationNames[j];
            const toStopId = `stop_${toStation.toLowerCase().replace(/\s+/g, '_')}`;
            
            // Verificar que ambas estaciones estén en el grafo
            const fromNodeId = `stop:${fromStopId}`;
            const toNodeId = `stop:${toStopId}`;
            
            if (graph.nodes[fromNodeId] && graph.nodes[toNodeId]) {
              // Calcular la distancia real entre las estaciones
              const fromCoord = metroStations[fromStation].coordinates;
              const toCoord = metroStations[toStation].coordinates;
              
              const distance = calculateDistance(
                fromCoord.latitude, fromCoord.longitude,
                toCoord.latitude, toCoord.longitude
              );
              
              // Calcular el tiempo basado en la cantidad de estaciones entre ellas
              const stationsCount = Math.abs(metroStations[fromStation].index - metroStations[toStation].index);
              const time = stationsCount * 3; // 3 minutos por estación
              
              // Añadir la arista directa
              graph.edges.push({
                from: fromNodeId,
                to: toNodeId,
                type: 'METRO',
                routeId: 'METRO_L1',
                distance: distance,
                time: time,
                cost: 5.50, // Costo fijo del metro
                occupancy: Math.floor(Math.random() * 80) // Ocupación aleatoria
              });
            }
          }
        }
      }
    }
    
    // Agregar vehículos al grafo
    for (const vehicle of routeVehicles) {
      const vehicleId = `vehicle:${vehicle.id}`;
      graph.vehicles[vehicleId] = vehicle;
    }
    
    return graph;
  } catch (error) {
    console.error('Error construyendo grafo de transporte:', error);
    return { nodes: {}, edges: [], vehicles: {} };
  }
}

/**
 * Reconstruir una ruta a partir de los nodos visitados
 * @param {Object} graph - Grafo de transporte
 * @param {Object} paths - Información de caminos
 * @param {string} endNodeId - ID del nodo final
 * @returns {Object} - Ruta reconstruida
 */
function reconstructRoute(graph, paths, endNodeId) {
  const routePath = paths[endNodeId];
  
  if (!routePath || !routePath.segments || routePath.segments.length === 0) {
    return null;
  }
  
  // Mejorar segmentos con detalles
  const enhancedSegments = enhanceSegmentsWithDetails(routePath.segments, graph);
  
  return {
    totalTime: routePath.totalTime,
    totalDistance: routePath.totalDistance,
    totalCost: routePath.totalCost,
    transfers: routePath.transfers,
    segments: enhancedSegments
  };
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
  console.log(`Buscando ruta óptima de ${startNodeId} a ${endNodeId} con preferencias:`, preferences);
  
  // Validaciones iniciales
  if (!graph || !graph.nodes || !graph.nodes[startNodeId] || !graph.nodes[endNodeId]) {
    console.error('Grafo inválido o nodos no encontrados');
    return null;
  }
  
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
  
  console.log('Pesos aplicados:', weights);
  
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
  
  // Cola de prioridad simple
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    // Ordenar cola por distancia (puntaje combinado)
    queue.sort((a, b) => distances[a] - distances[b]);
    
    // Obtener el nodo con menor distancia
    const currentNodeId = queue.shift();
    
    // Si llegamos al destino, terminar
    if (currentNodeId === endNodeId) {
      console.log(`Destino alcanzado con puntaje: ${distances[endNodeId]}`);
      break;
    }
    
    // Si ya visitamos este nodo, continuar
    if (visited.has(currentNodeId)) {
      continue;
    }
    
    visited.add(currentNodeId);
    
    // Obtener las aristas que salen del nodo actual
    const outgoingEdges = graph.edges.filter(edge => edge.from === currentNodeId);
    
    // Recorrer vecinos
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
      
      // Calcular tiempo de espera estimado para el vehículo, si aplica
      let waitTime = 0;
      if (edge.type !== 'WALK' && edge.type !== 'TRANSFER') {
        // Obtener el tiempo de espera estimado basado en la posición de los vehículos
        waitTime = estimateWaitTime(edge, graph.vehicles);
      }
      
      // Calcular costos combinados
      const newTime = currentPath.totalTime + edge.time + transferPenalty + waitTime;
      const newCost = currentPath.totalCost + (edge.cost || 0);
      const newDistance = currentPath.totalDistance + edge.distance;
      const newTransfers = currentPath.transfers + (transferPenalty > 0 ? 1 : 0);
      
      // Calcular puntaje combinado (menor es mejor)
      const occupancyFactor = edge.occupancy ? (edge.occupancy / 100) : 0;
      const combinedScore = 
        (newTime * weights.time) + 
        (newCost * weights.cost * 5) + // Multiplicador para equilibrar
        (occupancyFactor * weights.occupancy * 20) + // Factor de ocupación
        (newTransfers * weights.transfers * 15);     // Factor de transbordos
      
      // Log detallado para depuración
      if (neighborId === endNodeId || neighborId.includes('stop:stop3') || neighborId.includes('stop:stop1')) {
        console.log(`Evaluando ruta a ${neighborId}: tiempo=${newTime}, costo=${newCost}, transfers=${newTransfers}, score=${combinedScore}`);
      }
      
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
          cost: edge.cost || 0,
          distance: edge.distance,
          waitTime: waitTime,
          vehicleId: edge.nearestVehicleId
        };
        
        // Actualizar información del camino
        paths[neighborId] = {
          totalTime: newTime,
          totalCost: newCost,
          totalDistance: newDistance,
          segments: [...currentPath.segments, newSegment],
          transfers: newTransfers
        };
        
        // Añadir vecino a la cola si no está ya
        if (!queue.includes(neighborId)) {
          queue.push(neighborId);
        }
      }
    }
  }
  
  if (previous[endNodeId] === null) {
    console.error('No se encontró ruta al destino');
    return null; // No hay ruta al destino
  }
  
  // Reconstruir y mejorar la ruta
  return reconstructRoute(graph, paths, endNodeId);
}

/**
 * Estimar tiempo de espera para un vehículo en una arista de transporte
 * @param {Object} edge - Arista del grafo
 * @param {Object} vehicles - Vehículos disponibles
 * @returns {number} - Tiempo estimado de espera en minutos
 */
function estimateWaitTime(edge, vehicles) {
  if (!edge || !edge.routeId || !vehicles) {
    return 5; // Por defecto, 5 minutos
  }
  
  // Encontrar vehículos en la misma ruta
  const routeVehicles = Object.values(vehicles).filter(v => 
    v.route === edge.routeId && 
    v.status === 'IN_SERVICE' && 
    v.onDuty);
  
  if (routeVehicles.length === 0) {
    return 8; // No hay vehículos activos, asumimos frecuencia default
  }
  
  // Para este ejemplo simplificado, devolveremos un tiempo aleatorio entre 1 y 10 minutos,
  // simulando el tiempo de espera basado en la posición de los vehículos
  const minTime = Math.floor(Math.random() * 10) + 1;
  
  // Guardar la referencia al vehículo "más cercano"
  edge.nearestVehicleId = routeVehicles[0].id;
  
  return minTime;
}

/**
 * Mejorar los segmentos con detalles adicionales
 * @param {Array} segments - Segmentos de la ruta
 * @param {Object} graph - Grafo de transporte
 * @returns {Array} - Segmentos mejorados
 */
function enhanceSegmentsWithDetails(segments, graph) {
  try {
    return segments.map(segment => {
      const fromNode = graph.nodes[segment.from];
      const toNode = graph.nodes[segment.to];
      
      if (!fromNode || !toNode) {
        console.error(`Nodos no encontrados: ${segment.from} o ${segment.to}`);
        return segment;
      }
      
      const enhancedSegment = {
        ...segment,
        fromName: fromNode.name || fromNode.id,
        toName: toNode.name || toNode.id,
        path: []
      };
      
      // Generar path entre puntos
      if (fromNode.coordinates && toNode.coordinates) {
        const fromLat = fromNode.coordinates.latitude;
        const fromLng = fromNode.coordinates.longitude;
        const toLat = toNode.coordinates.latitude;
        const toLng = toNode.coordinates.longitude;
        
        enhancedSegment.path.push({
          latitude: fromLat,
          longitude: fromLng
        });
        
        // Para segmentos de metro, intentar usar rutas precisas
        if (segment.type === 'METRO' && segment.routeId && metroRoutes) {
          console.log(`Buscando ruta precisa de metro para ${segment.routeId} entre ${enhancedSegment.fromName} y ${enhancedSegment.toName}`);
          
          try {
            // Extraer nombre de la estación de los IDs de nodo (stop:stopX)
            const startStationName = enhancedSegment.fromName;
            const endStationName = enhancedSegment.toName;
            
            // Intentar obtener ruta precisa
            if (metroRoutes.findRouteSegment) {
              const routePolyline = metroRoutes.findRouteSegment(
                segment.routeId, 
                startStationName, 
                endStationName
              );
              
              if (routePolyline && routePolyline.length > 0) {
                console.log(`Encontrada ruta precisa con ${routePolyline.length} puntos`);
                // Usar la ruta precisa
                enhancedSegment.path = routePolyline.map(point => ({
                  latitude: point.latitude,
                  longitude: point.longitude
                }));
              } else {
                console.log(`No se encontró ruta precisa, usando aproximación simple`);
                addSimplePath(enhancedSegment, fromLat, fromLng, toLat, toLng, segment);
              }
            } else {
              console.log('metroRoutes.findRouteSegment no está disponible');
              addSimplePath(enhancedSegment, fromLat, fromLng, toLat, toLng, segment);
            }
          } catch (error) {
            console.error('Error al buscar ruta precisa de metro:', error);
            addSimplePath(enhancedSegment, fromLat, fromLng, toLat, toLng, segment);
          }
        } else {
          // Para otros tipos de transporte, usar aproximación simple
          addSimplePath(enhancedSegment, fromLat, fromLng, toLat, toLng, segment);
        }
      }
      
      // Si es un segmento de transporte, añadir el nombre de la ruta
      if (segment.routeId) {
        // En un caso real, buscaríamos el nombre de la ruta en la base de datos
        const routeNames = {
          'METRO_L1': 'Línea 1',
          'METRO_L2': 'Línea 2',
          'ROUTE_1': 'Ruta 1',
          'ROUTE_17': 'Ruta 17',
          'ROUTE_130': 'Ruta 130'
        };
        
        enhancedSegment.routeName = routeNames[segment.routeId] || segment.routeId;
      }
      
      // Añadir una descripción basada en el tipo de segmento
      enhancedSegment.description = getSegmentDescription(enhancedSegment);
      
      return enhancedSegment;
    });
  } catch (error) {
    console.error('Error al mejorar segmentos:', error);
    return segments;
  }
}

/**
 * Añadir un path simple entre dos puntos
 */
function addSimplePath(segment, fromLat, fromLng, toLat, toLng, originalSegment) {
  // Ya tenemos el punto inicial
  
  // Si la distancia es significativa, añadir un punto intermedio
  if (originalSegment.distance > 1000) {
    const midLat = (fromLat + toLat) / 2;
    const midLng = (fromLng + toLng) / 2;
    
    // Añadir un ligero desplazamiento para rutas que no son caminatas
    const offset = originalSegment.type !== 'WALK' ? 0.002 : 0;
    
    segment.path.push({
      latitude: midLat + offset,
      longitude: midLng - offset
    });
  }
  
  // Añadir punto final
  segment.path.push({
    latitude: toLat,
    longitude: toLng
  });
}

/**
 * Generar descripción para un segmento de ruta
 * @param {Object} segment - Segmento de ruta
 * @returns {string} - Descripción del segmento
 */
function getSegmentDescription(segment) {
  switch (segment.type) {
    case 'WALK':
      return `Caminar ${(segment.distance/1000).toFixed(2)} km (aprox. ${segment.time} min) desde ${segment.fromName} hasta ${segment.toName}`;
    case 'BUS':
      return `Tomar el autobús ${segment.routeName || segment.routeId} en ${segment.fromName} y bajar en ${segment.toName} (${segment.time} min)`;
    case 'METRO':
      return `Tomar el metro ${segment.routeName || segment.routeId} en ${segment.fromName} y bajar en ${segment.toName} (${segment.time} min)`;
    case 'MINIBUS':
      return `Tomar el minibús ${segment.routeName || segment.routeId} en ${segment.fromName} y bajar en ${segment.toName} (${segment.time} min)`;
    case 'TRANSFER':
      return `Transbordar de ${segment.fromName} a ${segment.toName}`;
    default:
      return `Viajar de ${segment.fromName} a ${segment.toName}`;
  }
}

// Exportar las funciones
module.exports = {
  planTrip,
  findNearbyStops,
  calculateDistance
}; 