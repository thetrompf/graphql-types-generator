import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from 'graphql-types-generator/plugin';
import { exists as existsNode, mkdir as mkdirNode } from 'fs';
import { promisify } from 'util';

const mkdir = promisify(mkdirNode);
const exist = promisify(existsNode);

interface TypeScriptConfig {
    importPrefix: string;
    outputPath: string;
}

export const plugin: GraphQLTypesGeneratorPlugin<TypeScriptConfig> = {
    configure(_, config) {
        if (
            typeof config !== 'object' ||
            config == null ||
            typeof (config as Partial<TypeScriptConfig>).importPrefix !== 'string' ||
            typeof (config as Partial<TypeScriptConfig>).outputPath !== 'string'
        ) {
            throw new Error(`[graphql-types-generator/plugins/typescript] must provide importPrefix, outputPath config parameters e.g.:

Relative import path.

--- # graphql-types-generator.yml
plugins:
  generator-types-generator/plugins/typescript:
    importPrefix: ./src/generated/schemas
    outputPath: ./src/generated/schemas

Absolute or mapped import path.
--- # graphql-types-generator.yml
plugins:
  generator-types-generator/plugins/typescript:
    importPrefix: graphql-app/schemas
    outputPath: ./src/generated/schemas


`);
        }
    },
    filesystem: {
        async initial(_, config) {
            if (!(await exist(config.outputPath))) {
                await mkdir(config.outputPath);
            }
        },
    },
    kind: GraphQLTypesPluginKind.TypeScript,
};
