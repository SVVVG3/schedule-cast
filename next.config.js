/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production build for now
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
