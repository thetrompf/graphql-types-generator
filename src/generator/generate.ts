import { GraphQLTypesGeneratorConfig } from 'graphql-types-generator/generator/config';
import { GraphQLTypesGeneratorPlugin, GraphQLTypesConfig, isConfigurablePlugin, GraphQLTypesConfigurable, GraphQLTypesFileSystemPlugin, isFileSytemPlugin, isGraphQLPlugin, GraphQLTypesGraphQLPlugin } from './plugin';
import { GeneratorContext } from './GeneratorContext';
import { ASTVisitor, TypeInfo, ASTNode, visit, visitWithTypeInfo, visitInParallel } from 'graphql';

type PluginImportPath = string & { '': 'PluginImportPath' };

export async function generate(config: GraphQLTypesGeneratorConfig): Promise<void> {
    const plugins = Object.entries(config.plugins);
    const resolvedPlugins = (await Promise.all(plugins.map(([pluginImportPath, pluginConfig]) => {
        console.log('Importing plugin: ' + pluginImportPath)
        return Promise.all([pluginImportPath, import(pluginImportPath), Promise.resolve(pluginConfig)]);
    }))).map(([pluginImportPath, pluginModule, config]) => [pluginImportPath, pluginModule, config] as [PluginImportPath, { plugin?: GraphQLTypesGeneratorPlugin }, GraphQLTypesConfig<any> | null]);

    const context = new GeneratorContext({} as any);
    const configurables: [GraphQLTypesConfigurable, GraphQLTypesConfig<any> | null][] = [];
    const filesystems: [GraphQLTypesFileSystemPlugin, GraphQLTypesConfig<any> | null][] = [];
    const graphqls: [GraphQLTypesGraphQLPlugin, GraphQLTypesConfig<any> | null][] = [];

    for (const pluginEntry of resolvedPlugins) {
        const plugin = pluginEntry[1] == null ? null : pluginEntry[1].plugin;
        if (plugin == null) {
            throw new Error(
                `${pluginEntry[0]} is not a valid module.
Make sure it exports a plugin property, conforming with the GraphQLTypesGeneratorPlugin interface.`,
            );
        }
        if (isConfigurablePlugin(plugin)) {
            configurables.push([plugin, pluginEntry[2]]);
        }
        if (isFileSytemPlugin(plugin)) {
            filesystems.push([plugin, pluginEntry[2]]);
        }
        if (isGraphQLPlugin(plugin)) {
            graphqls.push([plugin, pluginEntry[2]]);
        }
    }

    configurables.forEach(([plugin, config]) => {
        plugin.configure(context, config);
        plugin.config = config;
    });

    await Promise.all(
        filesystems
            .filter(([plugin]) => plugin.filesytem.initial != null)
            .map(([plugin, config]) => plugin.filesytem.initial!(context, config))
    );

    const visitors = graphqls
        .filter(([plugin]) => plugin.graphql.collect != null)
        .map(([plugin, config]) => plugin.graphql.collect!(context, config));

    visitor(context, visitors);
}

function visitor(context: GeneratorContext, visitors: ASTVisitor[]): void {
    const document = context.document;
    const schema = context.schema;
    const typeInfo = new TypeInfo(schema);
    document.definitions.forEach(def => visitNode(visitors, typeInfo, def));
}

function visitNode(visitors: ASTVisitor[], typeInfo: TypeInfo, astNode: ASTNode) {
    visit(
        astNode,
        visitWithTypeInfo(typeInfo, visitInParallel(visitors)),
    );
}
