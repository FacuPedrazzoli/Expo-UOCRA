import { suma, resta, multiplicacion, division, potencia } from '../src/00-cuentas';

test('suma 2 + 1 para igualar 3', () => {
  expect(suma(2, 1)).toBe(3);
});

test('resta 5 - 1 para igualar 4', () => {
  expect(resta(5, 1)).toBe(4);
});

test('multiplica 3 * 2 para igualar 6', () => {
  expect(multiplicacion(3, 2)).toBe(6);
});

test('divide 8 / 2 para igualar 4', () => {
  expect(division(8, 2)).toBe(4);
});

test('eleva 2 ^ 4 para igualar 16', () => {
  expect(potencia(2, 4)).toBe(16);
});