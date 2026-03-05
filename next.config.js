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

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  outputFileTracingRoot: require('path').join(__dirname),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '**', pathname: '/uploads/**' },
    ],
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
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
