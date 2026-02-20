// Only apply PWA in production builds
const withPWA = process.env.NODE_ENV === 'production' 
  ? require('@ducanh2912/next-pwa').default({
      dest: 'public',
      cacheOnFrontEndNav: true,
      aggressiveFrontEndNavCaching: true,
      reloadOnOnline: true,
      swcMinify: true,
      workboxOptions: {
        disableDevLogs: true,
      },
    })
  : (config) => config

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set empty turbopack config to use webpack (required for PWA)
  turbopack: {},
  // Fix workspace root warning
  outputFileTracingRoot: require('path').join(__dirname),
  // Note: output: 'standalone' removed because we use custom server (server.production.js) with Socket.IO
  // Limit workers to reduce resource usage on shared hosting
  experimental: {
    workerThreads: false,
    cpus: 1, // Use only 1 CPU core for building
  },
  // Remove dev-only origins in production
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      '192.168.56.1',
      '192.168.1.108',
      'localhost',
      '127.0.0.1',
    ],
  }),
}

module.exports = withPWA(nextConfig)
