/**
 * Generador de Identidades Aleatorias del Norte Argentino (UNSa Orán)
 */
export function generateRandomPersona() {
    const nombres = ['Facundo', 'Milagro', 'Lautaro', 'Milagros', 'Mateo', 'Guadalupe', 'Mariano', 'Anahí', 'Nahuel', 'Bautista', 'Sofía', 'Joaquín', 'Belén', 'Ramiro', 'Noelia', 'Agustín', 'Gimena'];
    const apellidos = ['Wayar', 'Saravia', 'Figueroa', 'Mamani', 'Quispe', 'Flores', 'Vargas', 'Burgos', 'Cruz', 'Geronimo', 'Tolaba', 'Tintilay', 'Choque', 'Arias'];
    
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
    
    const dni = Math.floor(Math.random() * 25000000) + 20000000; // Entre 20.000.000 y 45.000.000
    
    const cleanNombre = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanApellido = apellido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const email = `${cleanNombre}.${cleanApellido}.${Math.floor(Math.random() * 900) + 100}@gmail.com`;
    
    const telefono = `3878${Math.floor(Math.random() * 900000) + 100000}`; // Prefijo Orán (3878) + 6 dígitos
    
    const calles = ['Egües', 'Alvarado', 'Pellegrini', 'Belgrano', 'San Martín', 'Uriburu', 'López y Planes', 'Sarmiento', '9 de Julio'];
    const calle = calles[Math.floor(Math.random() * calles.length)];
    const altura = Math.floor(Math.random() * 1200) + 50;
    const direccion = `${calle} ${altura}`;
    
    const safeNombre = cleanNombre.charAt(0).toUpperCase() + cleanNombre.slice(1);
    const safeApellido = cleanApellido.charAt(0).toUpperCase() + cleanApellido.slice(1);
    const contrasena = `${safeNombre}${safeApellido}_${Math.floor(Math.random() * 90) + 10}#`;

    return {
        nombre,
        apellido,
        dni: String(dni),
        email,
        telefono,
        direccion,
        ciudad: 'San Ramón de la Nueva Orán',
        contrasena
    };
}
