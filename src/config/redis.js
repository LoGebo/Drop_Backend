const { createClient } = require('redis');
require('dotenv').config();

// Configuración del cliente de Redis para conexión a la nube
const redisClient = createClient({
  username: 'default',
  password: 'lJKruSMe1f2KKIxEospXIe8FNjmwednz',
  socket: {
    host: 'redis-10918.c15.us-east-1-4.ec2.redns.redis-cloud.com',
    port: 10918
  }
});

// Manejo de eventos del cliente Redis
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis Cloud server');
});

// Función para conectar a Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
};

module.exports = {
  redisClient,
  connectRedis
}; 