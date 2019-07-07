import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { validateConfig } from 'graphql-types-generator/generator/config';
import { generate } from 'graphql-types-generator/generator/generate';

try {
    const configPath = join(process.cwd(), 'graphql-types-generator.yml');
    if (!existsSync(configPath)) {
        throw new Error('Configuration not found');
    }
    const config = validateConfig(yaml.safeLoad(readFileSync(configPath).toString()));
    generate(config).then(
        () => {
            console.log('Done');
        },
        (err) => {
            console.error(err.stack);
            process.exit(1);
        },
    );
} catch (e) {
    console.error(e.stack);
    process.exit(1);
}
