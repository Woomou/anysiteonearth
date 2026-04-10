/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['three'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pngjs is Node.js-only; terrain tiles fall back to procedural noise in the browser
      config.resolve.fallback = { ...config.resolve.fallback, pngjs: false };
    }
    return config;
  },
}

module.exports = nextConfig