export interface GraphQLTypesGeneratorConfigPlugins {
    [pluginImportPath: string]: unknown;
}

export interface GraphQLTypesGeneratorConfig {
    plugins: GraphQLTypesGeneratorConfigPlugins
}

export function validateConfig(config: any): GraphQLTypesGeneratorConfig {
    if (config == null || Object.keys(config.plugins).length === 0) {
        throw new Error(`
Invalid configuration:
- plugings: must be an array of objects.
`);
    }
    return config;
}
