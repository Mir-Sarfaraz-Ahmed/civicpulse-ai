// Centralized configuration for CivicPulse AI Frontend
// In local development, falls back to http://localhost:5000
// In production (Vercel), uses the VITE_API_URL environment variable pointing to your Render backend

export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const API_BASE = `${BACKEND_URL}/api`;

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
