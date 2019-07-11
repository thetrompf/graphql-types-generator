import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { validateConfig } from 'graphql-types-generator/config';
import { generate } from 'graphql-types-generator/generate';

try {
    const configPath = join(process.cwd(), 'graphql-types-generator.yml');
    if (!existsSync(configPath)) {
        throw new Error(`Configuration not found.

Please create a graphql-types-generator.yml config file in your project root.
Example config:

--- # graphql-types-generator.yml
plugins:
  graphql-types-generator/plugins/context:
    importPath: graphql-app/Context
    importName: Context
  graphql-types-generator/plugins/resolver:
    importPrefix: graphql-app/resolvers
    outputPath: ./src/resolvers
  graphql-types-generator/plugins/schema:
    inputPath: ./schemas
  graphql-types-generator/plugins/typescript:
    importPrefix: graphql-app/schemas
    outputPath: ./src/generated/schemas
`);
    }
    const config = validateConfig(yaml.safeLoad(readFileSync(configPath).toString()));
    generate(config).then(
        () => {
            console.log('Done');
        },
        err => {
            console.error(err.stack);
            process.exit(1);
        },
    );
} catch (e) {
    console.error(e.stack);
    process.exit(1);
}
