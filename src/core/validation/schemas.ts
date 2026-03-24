import { z } from 'zod';

export const CreateInscripcionSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),
  
  apellido: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras'),
  
  dni: z.string()
    .min(6, 'El DNI debe tener al menos 6 dígitos')
    .max(10, 'El DNI no puede exceder 10 dígitos')
    .regex(/^\d+$/, 'El DNI debe contener solo números'),
  
  email: z.string()
    .email('Email inválido')
    .max(255, 'El email no puede exceder 255 caracteres'),
  
  como_te_enteraste: z.string()
    .uuid('ID de fuente inválido'),
  
  charlas: z.array(z.string().uuid()).max(5, 'Máximo 5 charlas permitidas'),
});

export type CreateInscripcionDTO = z.infer<typeof CreateInscripcionSchema>;

export const ValidateDniSchema = z.object({
  dni: z.string()
    .min(6, 'El DNI debe tener al menos 6 dígitos')
    .max(10, 'El DNI no puede exceder 10 dígitos')
    .regex(/^\d+$/, 'El DNI debe contener solo números'),
});

export type ValidateDniDTO = z.infer<typeof ValidateDniSchema>;

export const ValidateQrSchema = z.object({
  qr_data: z.string()
    .min(1, 'El código QR es requerido')
    .max(100, 'El código QR es demasiado largo'),
});

export type ValidateQrDTO = z.infer<typeof ValidateQrSchema>;

export const ClienteLogSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string().min(1).max(500),
});

export type ClienteLogDTO = z.infer<typeof ClienteLogSchema>;
