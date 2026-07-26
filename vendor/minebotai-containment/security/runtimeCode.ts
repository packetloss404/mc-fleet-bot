export const RUNTIME_CODE_TRUSTED_ENV = 'BODY_RUNTIME_CODE_TRUSTED';

export function isRuntimeCodeTrustedModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env[RUNTIME_CODE_TRUSTED_ENV]?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function runtimeCodeTrustedModeError(action: string): string {
  return `${action} requires ${RUNTIME_CODE_TRUSTED_ENV}=true`;
}
