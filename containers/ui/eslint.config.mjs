import nextConfig from 'eslint-config-next';
import eslintConfigPrettier from 'eslint-config-prettier';

const config = [...nextConfig, eslintConfigPrettier];
export default config;