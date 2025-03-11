# Documentación del archivo 01-Ejercicio.ts

## Descripción

Este archivo realiza la conjugación de verbos regulares en los 3 tiempos verbales: Pasado, Presente y Futuro.

## Clase `VerbosRegulares`

### Métodos

#### `constructor()`

- `raiz`: Elimina la terminación del infinitivo (-ar, -er, -ir) para obtener la raíz.

#### `presente()`

1. Comprueba si el infinitivo termina en "ar". Si esto es cierto, le agrega las terminaciones correspondientes a la raíz.
2. Comprueba si el infinitivo termina en "er" o "ir". Si esto es cierto, le agrega las terminaciones correspondientes a la raíz con los operadores ternarios.
3. Si no se ingresó ninguna de las terminaciones mencionadas, realiza un `throw new Error()`.

#### `pasado()`

1. Comprueba si el infinitivo termina en "ar". Si esto es cierto, le agrega las terminaciones correspondientes a la raíz.
2. Comprueba si el infinitivo termina en "er" o "ir". Si esto es cierto, le agrega las terminaciones correspondientes a la raíz con los operadores ternarios.
3. Si no se ingresó ninguna de las terminaciones mencionadas, realiza un `throw new Error()`.

#### `futuro()`

Este método directamente realiza el mapeo con las terminaciones que correspondan, no es necesario comprobar ninguna terminación.

## Ejemplo de Uso

Para utilizar las funciones definidas en este archivo, simplemente importa y utiliza la clase `VerbosRegulares`:

```typescript
import { VerbosRegulares } from "./01-Ejercicio";

const verbo = new VerbosRegulares("Programar");

console.log("Pasado:", verbo.pasado());
console.log("Presente:", verbo.presente());
console.log("Futuro:", verbo.futuro());
```
