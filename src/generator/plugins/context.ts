import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from 'graphql-types-generator/plugin';

interface ContextPluginConfig {
    importPath: string;
    importName: string;
}

export const plugin: GraphQLTypesGeneratorPlugin<ContextPluginConfig> = {
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
    //     filesystem: {
    //         initial: async (_context, config): Promise<void> => {
    //             try {
    //                 const contextModule = await import(config.importPath);
    //                 if (typeof contextModule == null || typeof contextModule[config.importName] == null) {
    //                     throw new Error(
    //                         `[graphql-types-generator/plugins/context] The context module was successfully loaded
    // but could not find the Context export with name ${config.importName},
    // check if you have provided the correct importName in the config.`,
    //                     );
    //                 }
    //             } catch (e) {
    //                 console.error(e);
    //                 throw new Error(`Could not load context from importPath: ${config.importPath}`);
    //             }
    //         },
    //     },
    kind: GraphQLTypesPluginKind.TypeScript,
};
