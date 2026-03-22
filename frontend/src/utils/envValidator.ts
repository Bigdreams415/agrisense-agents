export function validateEnvironment() {
  const requiredEnvVars = [
    'SENTINEL_CLIENT_ID',
    'SENTINEL_CLIENT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}