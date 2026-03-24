import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'validator' | 'viewer';
  iat: number;
  exp: number;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'admin' | 'validator' | 'viewer';
}

export const generateToken = (payload: TokenPayload): string => {
  const expiresIn = (config.jwt.expiresIn || '8h') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
};

export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
