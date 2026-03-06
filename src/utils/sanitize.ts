/**
 * Sanitización básica de inputs del formulario de inscripción.
 * mysql2 con prepared statements previene SQL injection, pero
 * limpiamos caracteres problemáticos para el negocio.
 */

export function sanitizeString(value: unknown, maxLength = 255): string {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .replace(/[\x00-\x1F\x7F]/g, '')   // Eliminar caracteres de control
        .slice(0, maxLength);
}

export function sanitizeName(value: unknown): string {
    return sanitizeString(value, 50)
        .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
}

export function sanitizeDNI(value: unknown): string {
    return sanitizeString(value, 20)
        .replace(/\D/g, '');  // Solo dígitos
}

export function sanitizeEmail(value: unknown): string {
    return sanitizeString(value, 100).toLowerCase();
}

export function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function validateDNI(dni: string): boolean {
    return /^\d{6,10}$/.test(dni);  // Entre 6 y 10 dígitos
}

/**
 * Sanitiza y valida todos los campos de inscripción.
 * Lanza error descriptivo si algo no es válido.
 */
export interface InscripcionInput {
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    como_te_enteraste: string;
    charlas: string[];
}

export function sanitizeAndValidateInscripcion(body: any): InscripcionInput {
    const nombre    = sanitizeName(body.nombre);
    const apellido  = sanitizeName(body.apellido);
    const dni       = sanitizeDNI(body.dni);
    const email     = sanitizeEmail(body.email);
    const comoTeEnt = sanitizeString(body.como_te_enteraste, 10);

    // Normalizar charlas a array de strings (soporta single charla legacy o array)
    let charlas: string[] = [];
    if (Array.isArray(body.charlas)) {
        charlas = body.charlas.map((c: any) => sanitizeString(c, 10));
    } else if (typeof body.charlas === 'string' && body.charlas) {
        charlas = [sanitizeString(body.charlas, 10)];
    } else if (typeof body.charla === 'string' && body.charla) {
        // Compatibilidad con frontend legacy que envía "charla" (singular)
        charlas = [sanitizeString(body.charla, 10)];
    }

    // Validaciones de negocio
    if (!nombre)     throw Object.assign(new Error('El nombre es obligatorio'), { statusCode: 400 });
    if (!apellido)   throw Object.assign(new Error('El apellido es obligatorio'), { statusCode: 400 });
    if (!dni)        throw Object.assign(new Error('El DNI es obligatorio'), { statusCode: 400 });
    if (!email)      throw Object.assign(new Error('El email es obligatorio'), { statusCode: 400 });
    if (!comoTeEnt)  throw Object.assign(new Error('El campo ¿cómo te enteraste? es obligatorio'), { statusCode: 400 });
    if (!charlas.length) throw Object.assign(new Error('Debes seleccionar al menos una charla'), { statusCode: 400 });

    if (!validateDNI(dni))    throw Object.assign(new Error('El DNI debe contener entre 6 y 10 dígitos'), { statusCode: 400 });
    if (!validateEmail(email)) throw Object.assign(new Error('El formato del email no es válido'), { statusCode: 400 });

    // Eliminar charlas vacías o inválidas
    charlas = charlas.filter(c => c.length > 0);
    if (!charlas.length) throw Object.assign(new Error('No se recibieron charlas válidas'), { statusCode: 400 });

    return { nombre, apellido, dni, email, como_te_enteraste: comoTeEnt, charlas };
}
