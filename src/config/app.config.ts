import { registerAs } from '@nestjs/config';
import { AppConfig } from './app-config.type';
import validateConfig from '.././utils/validate-config';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT: number;

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_DOMAIN: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  BACKEND_DOMAIN: string;

  @IsString()
  @IsOptional()
  API_PREFIX: string;

  @IsString()
  @IsOptional()
  APP_FALLBACK_LANGUAGE: string;

  @IsString()
  @IsOptional()
  APP_HEADER_LANGUAGE: string;

  @IsString()
  @IsOptional()
  APP_NAME: string;

  @IsString()
  @IsOptional()
  APP_WORKING_DIRECTORY: string;

  @IsString()
  @IsOptional()
  APP_BACKEND_DOMAIN: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL: string;

  @IsString()
  @IsOptional()
  OPENAI_BASE_URL: string;

  @IsString()
  @IsOptional()
  OLLAMA_MODEL: string;

  @IsString()
  @IsOptional()
  OLLAMA_BASE_URL: string;

  @IsString()
  @IsOptional()
  DOCKER_HOST: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsInt()
  @IsOptional()
  REDIS_PORT: number;
}

export default registerAs<AppConfig>('app', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'app',
    workingDirectory: process.env.PWD || process.cwd(),
    frontendDomain: process.env.FRONTEND_DOMAIN,
    backendDomain: process.env.BACKEND_DOMAIN ?? 'http://localhost',
    port: process.env.APP_PORT
      ? parseInt(process.env.APP_PORT, 10)
      : process.env.PORT
        ? parseInt(process.env.PORT, 10)
        : 3000,
    apiPrefix: process.env.API_PREFIX || 'api',
    fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
    headerLanguage: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
    name: process.env.APP_NAME || 'app',
    workingDirectory: process.env.PWD || process.cwd(),
    backendDomain: process.env.APP_BACKEND_DOMAIN ?? 'http://localhost',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    ollamaModel: process.env.OLLAMA_MODEL,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
    dockerHost: process.env.DOCKER_HOST || '/var/run/docker.sock',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  };
});