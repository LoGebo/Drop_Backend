/**
 * Modelo de ruta de transporte para almacenar en Redis
 */
class Route {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.type = data.type || 'BUS'; // BUS, MINIBUS, TRAIN, METRO, PREMIUM_BUS
        this.stops = data.stops || []; // Array de paradas
        this.distance = data.distance || 0; // Distancia total en metros
        this.estimatedTime = data.estimatedTime || 0; // Tiempo estimado en minutos
        this.frequency = data.frequency || 15; // Frecuencia de paso en minutos
        this.basePrice = data.basePrice || this.calculateBaseFare(data.type); // Precio base
        this.schedule = data.schedule || this.defaultSchedule();
        this.status = data.status || 'ACTIVE'; // ACTIVE, SUSPENDED, PLANNED
        this.createDate = data.createDate || Date.now();
        this.lastUpdated = data.lastUpdated || Date.now();
        this.popularity = data.popularity || 0; // Indicador de popularidad (0-100)
    }

    /**
     * Agregar una parada a la ruta
     * @param {Object} stop - Información de la parada
     */
    addStop(stop) {
        // Validar que la parada tenga la estructura correcta
        if (!stop.id || !stop.name || !stop.coordinates) {
            throw new Error('La parada debe tener id, nombre y coordenadas');
        }

        // Agregar la parada
        this.stops.push({
            id: stop.id,
            name: stop.name,
            coordinates: stop.coordinates,
            arrivalTime: stop.arrivalTime || null,
            departureTime: stop.departureTime || null,
            features: stop.features || []
        });

        // Recalcular distancia total
        this.recalculateDistance();
        this.lastUpdated = Date.now();
    }

    /**
     * Recalcular la distancia total de la ruta
     */
    recalculateDistance() {
        let totalDistance = 0;
        
        for (let i = 0; i < this.stops.length - 1; i++) {
            const currentStop = this.stops[i];
            const nextStop = this.stops[i + 1];
            
            totalDistance += this.calculateDistance(
                currentStop.coordinates.latitude, 
                currentStop.coordinates.longitude,
                nextStop.coordinates.latitude, 
                nextStop.coordinates.longitude
            );
        }
        
        this.distance = Math.round(totalDistance);
        this.estimatedTime = this.calculateEstimatedTime(totalDistance, this.type);
    }

    /**
     * Calcular la distancia entre dos puntos usando la fórmula de Haversine
     * @param {number} lat1 - Latitud del punto 1
     * @param {number} lon1 - Longitud del punto 1
     * @param {number} lat2 - Latitud del punto 2
     * @param {number} lon2 - Longitud del punto 2
     * @returns {number} - Distancia en metros
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
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
     * Calcular tiempo estimado basado en distancia y tipo de transporte
     * @param {number} distance - Distancia en metros
     * @param {string} transportType - Tipo de transporte
     * @returns {number} - Tiempo estimado en minutos
     */
    calculateEstimatedTime(distance, transportType) {
        // Velocidades promedio en metros/minuto
        const speeds = {
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
    calculateBaseFare(transportType) {
        const fares = {
            'BUS': 12.00,
            'MINIBUS': 10.00,
            'TRAIN': 20.00,
            'METRO': 15.00,
            'PREMIUM_BUS': 35.00
        };
        
        return fares[transportType] || 12.00;
    }

    /**
     * Generar un horario por defecto
     * @returns {Object} - Horario por defecto
     */
    defaultSchedule() {
        return {
            monday: { start: '05:00', end: '23:00' },
            tuesday: { start: '05:00', end: '23:00' },
            wednesday: { start: '05:00', end: '23:00' },
            thursday: { start: '05:00', end: '23:00' },
            friday: { start: '05:00', end: '23:00' },
            saturday: { start: '06:00', end: '22:00' },
            sunday: { start: '07:00', end: '22:00' }
        };
    }
}

module.exports = Route; 