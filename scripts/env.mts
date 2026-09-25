// Load .env.local when running scripts locally. On the server the variables
// come from the hosting panel and the file does not exist.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No local env file; rely on the process environment.
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set.`);
    process.exit(1);
  }
  return value;
}
