'use strict';

module.exports = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  // Additional Next.js configuration can go here
};