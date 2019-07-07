import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from '../plugin';

interface TypeScriptConfig {}

export const plugin: GraphQLTypesGeneratorPlugin<TypeScriptConfig> = {
    config: null as any,
    kind: GraphQLTypesPluginKind.TypeScript,
};
