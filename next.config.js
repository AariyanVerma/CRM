const os = require('os')

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

function getLanHosts() {
  const hosts = ['localhost', '127.0.0.1']
  const nets = os.networkInterfaces()
  for (const entries of Object.values(nets)) {
    if (!entries) continue
    for (const net of entries) {
      if (net.family === 'IPv4' && !net.internal) {
        hosts.push(net.address)
      }
    }
  }
  return hosts
}

const isDev = process.env.NODE_ENV === 'development'

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  outputFileTracingRoot: require('path').join(__dirname),
  images: {
    unoptimized: isDev,
    remotePatterns: [
      { protocol: 'https', hostname: '**', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '**', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'app.newyorkgoldmarket.com', pathname: '/**' },
      { protocol: 'http', hostname: 'app.newyorkgoldmarket.com', pathname: '/**' },
    ],
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  ...(isDev && {
    allowedDevOrigins: getLanHosts(),
  }),
}

module.exports = withPWA(nextConfig)
