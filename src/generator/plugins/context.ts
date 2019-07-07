import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from 'graphql-types-generator/generator/plugin';

interface ContextPluginConfig {
    importPath: string;
    importName: string;
}

export const plugin: GraphQLTypesGeneratorPlugin<ContextPluginConfig> = {
    config: null as any,
    configure(_, config): void {
        if (
            typeof config !== 'object' ||
            config == null ||
            typeof (config as Partial<ContextPluginConfig>).importPath !== 'string' ||
            typeof (config as Partial<ContextPluginConfig>).importName !== 'string'
        ) {
            throw new Error(`[graphql-types-generator/plugins/context] must provide importPath, importName config parameters e.g.:

Relative import path.

--- # graphql-types-generator.yml
plugins:
  generator-types-generator/plugins/context:
    importPath: ./src/grapqhl
    importName: Context

Absolute or mapped import path.
--- # graphql-types-generator.yml
plugins:
  generator-types-generator/plugins/context:
    importPath: my-awesome-server/graphql/context
    importName: GraphQLContext


`);
        }
    },
    kind: GraphQLTypesPluginKind.TypeScript,
}
