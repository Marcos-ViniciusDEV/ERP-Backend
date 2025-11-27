import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OpenAPI YAML file
const yamlFilePath = path.join(__dirname, '../openapi.yaml');
const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');

// Parse YAML to JSON
export const swaggerSpec = yaml.load(yamlContent) as object;


