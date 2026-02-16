/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow cross-origin requests from network IPs in development
  allowedDevOrigins: [
    '192.168.56.1',
    '192.168.1.108',
    'localhost',
    '127.0.0.1',
  ],
}

module.exports = nextConfig
