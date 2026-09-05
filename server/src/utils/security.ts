import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);
export const comparePassword = async (password: string, hash: string) => bcrypt.compare(password, hash);

export const signJwt = (payload: Record<string, unknown>) =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

export const verifyJwt = (token: string) => jwt.verify(token, config.jwtSecret) as { userId: string };
