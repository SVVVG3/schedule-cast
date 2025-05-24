/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production build for now
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer'),
        crypto: false,
        stream: false,
        util: false,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Handle problematic Solana dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/buffer-layout': false,
      '@solana/codecs-numbers': false,
      '@solana/web3.js': false,
    };

    return config;
  },
}

module.exports = nextConfig
