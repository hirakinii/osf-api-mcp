import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SwaggerLoader } from '../utils/swagger-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates a SwaggerLoader instance loaded with the minimal test fixture
 */
export async function createMinimalLoader(): Promise<SwaggerLoader> {
  const loader = new SwaggerLoader();
  const fixturePath = join(__dirname, '../__fixtures__/swagger-minimal.json');
  await loader.load(fixturePath);
  return loader;
}

/**
 * Creates a SwaggerLoader instance loaded with edge cases fixture
 */
export async function createEdgeCasesLoader(): Promise<SwaggerLoader> {
  const loader = new SwaggerLoader();
  const fixturePath = join(__dirname, '../__fixtures__/swagger-edge-cases.json');
  await loader.load(fixturePath);
  return loader;
}

/**
 * Returns the path to the minimal fixture
 */
export function getMinimalFixturePath(): string {
  return join(__dirname, '../__fixtures__/swagger-minimal.json');
}

/**
 * Returns the path to the edge cases fixture
 */
export function getEdgeCasesFixturePath(): string {
  return join(__dirname, '../__fixtures__/swagger-edge-cases.json');
}
