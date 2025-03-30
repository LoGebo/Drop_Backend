/**
 * Modelo de vehículo para almacenar en Redis
 */
class Vehicle {
    constructor(data = {}) {
        this.id = data.id || null;
        this.licensePlate = data.licensePlate || '';
        this.driver = data.driver || '';
        this.route = data.route || null;
        this.type = data.type || 'BUS'; // BUS, MINIBUS, TRAIN, METRO, PREMIUM_BUS
        this.capacity = data.capacity || 50;
        this.occupancy = data.occupancy || 0; // Porcentaje de ocupación (0-100)
        this.status = data.status || 'AVAILABLE'; // AVAILABLE, MAINTENANCE, OUT_OF_SERVICE
        this.coordinates = data.coordinates || { latitude: 0, longitude: 0 };
        this.speed = data.speed || 0; // En km/h
        this.heading = data.heading || 0; // Dirección en grados (0-360)
        this.lastUpdated = data.lastUpdated || Date.now();
        this.nextStopId = data.nextStopId || null;
        this.estimatedTimeToNextStop = data.estimatedTimeToNextStop || null; // En minutos
        this.features = data.features || []; // WiFi, A/C, AccessibilityFeatures, etc.
        this.pricePerKm = data.pricePerKm || this.calculateBaseFare(data.type);
    }

    /**
     * Actualizar información del vehículo
     * @param {Object} data - Nuevos datos 
     */
    update(data) {
        if (data.route !== undefined) this.route = data.route;
        if (data.driver !== undefined) this.driver = data.driver;
        if (data.status !== undefined) this.status = data.status;
        if (data.coordinates !== undefined) this.coordinates = data.coordinates;
        if (data.speed !== undefined) this.speed = data.speed;
        if (data.heading !== undefined) this.heading = data.heading;
        if (data.occupancy !== undefined) this.occupancy = data.occupancy;
        if (data.nextStopId !== undefined) this.nextStopId = data.nextStopId;
        if (data.estimatedTimeToNextStop !== undefined) this.estimatedTimeToNextStop = data.estimatedTimeToNextStop;
        
        this.lastUpdated = Date.now();
    }

    /**
     * Calcular tarifa base según tipo de vehículo
     * @param {string} vehicleType 
     * @returns {number} - tarifa base en pesos
     */
    calculateBaseFare(vehicleType) {
        const fares = {
            'BUS': 0.5,          // 12 pesos base
            'MINIBUS': 0.42,     // 10 pesos base
            'TRAIN': 0.83,       // 20 pesos base
            'METRO': 0.63,       // 15 pesos base
            'PREMIUM_BUS': 1.46  // 35 pesos base
        };
        
        return fares[vehicleType] || 0.5; // Por defecto tarifa de BUS
    }
}

module.exports = Vehicle; 