/**
 * Coordenadas precisas de las líneas de metro de Monterrey
 * Estos datos representan el trazado real de las rutas del metro
 */

// Coordenadas de la Línea 1 del Metro (Talleres - Exposición)
const metroLinea1 = [
  // Coordenadas precisas para la línea 1
  { latitude: 25.75389, longitude: -100.36528 }, // Talleres
  { latitude: 25.74833, longitude: -100.36167 }, // San Bernabé
  { latitude: 25.74194, longitude: -100.35500 }, // Unidad Modelo
  { latitude: 25.7321485, longitude: -100.3472600 }, // Aztlán
  { latitude: 25.7233152, longitude: -100.3425450 }, // Penitenciaría
  { latitude: 25.71611, longitude: -100.34250 }, // Alfonso Reyes
  { latitude: 25.7059242, longitude: -100.3424003 }, // Mitras
  { latitude: 25.6987474, longitude: -100.3431880 }, // Simón Bolívar
  { latitude: 25.69194, longitude: -100.34417 }, // Hospital
  { latitude: 25.68694, longitude: -100.33361 }, // Edison
  { latitude: 25.68694, longitude: -100.32444 }, // Central
  { latitude: 25.68611, longitude: -100.31694 }, // Cuauhtémoc
  { latitude: 25.68512, longitude: -100.30663 }, // Del Golfo
  { latitude: 25.68389, longitude: -100.29667 }, // Félix U. Gómez
  { latitude: 25.68361, longitude: -100.28806 }, // Parque Fundidora
  { latitude: 25.6832309, longitude: -100.2794460 }, // Y Griega
  { latitude: 25.68000, longitude: -100.26417 }, // Eloy Cavazos
  { latitude: 25.67972, longitude: -100.25278 }, // Lerdo de Tejada
  { latitude: 25.67944, longitude: -100.24556 }  // Exposición
];

// Para la Línea 2 del Metro, usamos una aproximación simplificada por ahora
// En un caso real, se recomienda obtener las coordenadas exactas como con la Línea 1
const metroLinea2 = [
  // General Anaya hacia Sendero
  { latitude: 25.6730, longitude: -100.3178 }, // Estación General Anaya
  { latitude: 25.6743, longitude: -100.3215 },
  { latitude: 25.6756, longitude: -100.3255 },
  { latitude: 25.6769, longitude: -100.3295 },
  { latitude: 25.6781, longitude: -100.3333 },
  { latitude: 25.6798, longitude: -100.3394 }, // Estación Santa Lucía
  { latitude: 25.6823, longitude: -100.3400 },
  { latitude: 25.6849, longitude: -100.3405 },
  { latitude: 25.6874, longitude: -100.3410 },
  { latitude: 25.6899, longitude: -100.3415 },
  { latitude: 25.6929, longitude: -100.3419 },
  { latitude: 25.6957, longitude: -100.3420 }
];

// Mapa de estaciones para la Línea 1 con sus coordenadas exactas
const metroLinea1Stations = {
  "Talleres": { index: 0, coordinates: { latitude: 25.75389, longitude: -100.36528 } },
  "San Bernabé": { index: 1, coordinates: { latitude: 25.74833, longitude: -100.36167 } },
  "Unidad Modelo": { index: 2, coordinates: { latitude: 25.74194, longitude: -100.35500 } },
  "Aztlán": { index: 3, coordinates: { latitude: 25.7321485, longitude: -100.3472600 } },
  "Penitenciaría": { index: 4, coordinates: { latitude: 25.7233152, longitude: -100.3425450 } },
  "Alfonso Reyes": { index: 5, coordinates: { latitude: 25.71611, longitude: -100.34250 } },
  "Mitras": { index: 6, coordinates: { latitude: 25.7059242, longitude: -100.3424003 } },
  "Simón Bolívar": { index: 7, coordinates: { latitude: 25.6987474, longitude: -100.3431880 } },
  "Hospital": { index: 8, coordinates: { latitude: 25.69194, longitude: -100.34417 } },
  "Edison": { index: 9, coordinates: { latitude: 25.68694, longitude: -100.33361 } },
  "Central": { index: 10, coordinates: { latitude: 25.68694, longitude: -100.32444 } },
  "Cuauhtémoc": { index: 11, coordinates: { latitude: 25.68611, longitude: -100.31694 } },
  "Del Golfo": { index: 12, coordinates: { latitude: 25.68512, longitude: -100.30663 } },
  "Félix U. Gómez": { index: 13, coordinates: { latitude: 25.68389, longitude: -100.29667 } },
  "Parque Fundidora": { index: 14, coordinates: { latitude: 25.68361, longitude: -100.28806 } },
  "Y Griega": { index: 15, coordinates: { latitude: 25.6832309, longitude: -100.2794460 } },
  "Eloy Cavazos": { index: 16, coordinates: { latitude: 25.68000, longitude: -100.26417 } },
  "Lerdo de Tejada": { index: 17, coordinates: { latitude: 25.67972, longitude: -100.25278 } },
  "Exposición": { index: 18, coordinates: { latitude: 25.67944, longitude: -100.24556 } }
};

// Mapa de estaciones para la Línea 2 con sus coordenadas aproximadas
const metroLinea2Stations = {
  "General Anaya": { index: 0, coordinates: { latitude: 25.6730, longitude: -100.3178 } },
  "Alameda": { index: 2, coordinates: { latitude: 25.6756, longitude: -100.3255 } },
  "Fundadores": { index: 4, coordinates: { latitude: 25.6781, longitude: -100.3333 } },
  "Santa Lucía": { index: 6, coordinates: { latitude: 25.6798, longitude: -100.3394 } },
  "Niños Héroes": { index: 8, coordinates: { latitude: 25.6849, longitude: -100.3405 } },
  "Universidad": { index: 10, coordinates: { latitude: 25.6899, longitude: -100.3415 } },
  "Sendero": { index: 12, coordinates: { latitude: 25.6957, longitude: -100.3420 } }
};

// Exportamos los datos de las rutas de metro
module.exports = {
  metroLinea1,
  metroLinea2,
  metroLinea1Stations,
  metroLinea2Stations,
  // Función auxiliar para encontrar el segmento de una línea entre dos estaciones
  findRouteSegment: (line, startStation, endStation) => {
    const stations = line === 'METRO_L1' ? metroLinea1Stations : metroLinea2Stations;
    const polyline = line === 'METRO_L1' ? metroLinea1 : metroLinea2;
    
    if (!stations[startStation] || !stations[endStation]) {
      return null;
    }
    
    const startIndex = stations[startStation].index;
    const endIndex = stations[endStation].index;
    
    if (startIndex < endIndex) {
      // Ruta en dirección normal
      return polyline.slice(startIndex, endIndex + 1);
    } else {
      // Ruta en dirección inversa
      return polyline.slice(endIndex, startIndex + 1).reverse();
    }
  },
  // Función para encontrar la estación más cercana a unas coordenadas
  findNearestStation: (latitude, longitude, line = 'METRO_L1') => {
    const stations = line === 'METRO_L1' ? metroLinea1Stations : metroLinea2Stations;
    let minDistance = Infinity;
    let nearestStation = null;
    
    for (const [name, data] of Object.entries(stations)) {
      const station = data.coordinates;
      // Usar la fórmula de Haversine para calcular la distancia en kilómetros
      const R = 6371; // Radio de la Tierra en km
      const dLat = (station.latitude - latitude) * Math.PI / 180;
      const dLon = (station.longitude - longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(latitude * Math.PI / 180) * Math.cos(station.latitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = name;
      }
    }
    
    return {
      name: nearestStation,
      station: stations[nearestStation],
      distance: minDistance * 1000 // Convertir a metros
    };
  }
}; 