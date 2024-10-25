const crypto = require('crypto');
const axios = require('axios');

async function checkPassword(password) {
  // Generar el hash SHA-1 de la contraseña
  const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  
  // Dividir el hash en dos partes
  const prefix = sha1Hash.substring(0, 5);
  const suffix = sha1Hash.substring(5);

  try {
    // Hacer una solicitud a la API de Have I Been Pwned con los primeros 5 caracteres del hash
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
    
    // Verificar si el sufijo está en la lista de respuestas devueltas
    const hashes = response.data.split('\n');
    for (const hash of hashes) {
      const [hashSuffix, count] = hash.split(':');
      if (hashSuffix === suffix) {
        return { compromised: true, count: parseInt(count, 10) };
      }
    }

    // Si no hay coincidencia, la contraseña no ha sido comprometida
    return { compromised: false };
  } catch (error) {
    console.error('Error al consultar la API:', error);
    throw new Error('No se pudo verificar la contraseña.');
  }
}

// Uso del método para verificar una contraseña
checkPassword('123456').then((result) => {
  if (result.compromised) {
    console.log(`¡Cuidado! Esta contraseña ha sido expuesta ${result.count} veces.`);
  } else {
    console.log('Esta contraseña no ha sido expuesta en filtraciones conocidas.');
  }
});
