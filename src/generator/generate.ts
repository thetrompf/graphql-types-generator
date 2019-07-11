import { GraphQLTypesGeneratorConfig } from 'graphql-types-generator/config';
import {
    GraphQLTypesConfigurablePlugin as ConfigurablePlugin,
    GraphQLTypesFileSystemPlugin as FileSystemPlugin,
    GraphQLTypesGeneratorPluginConfig as PluginConfig,
    GraphQLTypesGeneratorPluginModule as PluginModule,
    GraphQLTypesGeneratorTypeScriptPlugin as TypeScriptPlugin,
    GraphQLTypesGraphQLPlugin as GraphQLPlugin,
    isConfigurablePlugin,
    isFileSystemCollectedPhasePlugin,
    isFileSystemInitialPhasePlugin,
    isFileSystemPlugin,
    isGraphQLCollectorPlugin,
    isGraphQLPlugin,
    isGraphQLValidatorPlugin,
    isTypeScriptPlugin,
    isTypeScriptTransformPlugin,
    isFileSystemFinalizedPhasePlugin,
} from 'graphql-types-generator/plugin';
import { GeneratorContext } from 'graphql-types-generator/GeneratorContext';
import { ASTVisitor, TypeInfo, ASTNode, visit, visitWithTypeInfo, visitInParallel } from 'graphql';
import { filterMap, filterTupleEntry } from 'graphql-types-generator/utilities';
import { validateSDL } from 'graphql/validation/validate';
import { SDLValidationRule } from 'graphql/validation/ValidationContext';

type PluginImportPath = string & { '': 'PluginImportPath' };

function visitNode(visitors: ASTVisitor[], typeInfo: TypeInfo, astNode: ASTNode) {
    visit(astNode, visitWithTypeInfo(typeInfo, visitInParallel(visitors)));
}

function visitor(context: GeneratorContext, visitors: ASTVisitor[], validators: SDLValidationRule[]): void {
    const document = context.document;
    const schema = context.schema;
    const typeInfo = new TypeInfo(schema);
    document.definitions.forEach(def => visitNode(visitors, typeInfo, def));
    validateSDL(document, schema, validators);
}

export async function generate(config: GraphQLTypesGeneratorConfig): Promise<void> {
    const plugins = Object.entries(config.plugins);
    const resolvedPlugins = (await Promise.all(
        plugins.map(([pluginImportPath, pluginConfig]) => {
            console.log('Importing plugin: ' + pluginImportPath);
            return Promise.all([
                Promise.resolve(pluginImportPath as PluginImportPath),
                import(pluginImportPath) as Promise<PluginModule>,
                Promise.resolve(pluginConfig as PluginConfig),
            ]);
        }),
    )).map(
        <TPluginConfig extends PluginConfig>([pluginImportPath, pluginModule, config]: [
            PluginImportPath,
            PluginModule<TPluginConfig>,
            TPluginConfig,
        ]) => [pluginImportPath, pluginModule, config],
    ) as [PluginImportPath, PluginModule, PluginConfig][];

    const context = new GeneratorContext({} as any);
    const configurablePlugins: [ConfigurablePlugin, PluginConfig][] = [];
    const filesystemPlugins: [FileSystemPlugin, PluginConfig][] = [];
    const graphQLPlugins: [GraphQLPlugin, PluginConfig][] = [];
    const typescriptPlugins: [TypeScriptPlugin, PluginConfig][] = [];

    for (const pluginEntry of resolvedPlugins) {
        const plugin = pluginEntry[1] == null ? null : pluginEntry[1].plugin;
        if (plugin == null) {
            throw new Error(
                `${pluginEntry[0]} is not a valid module.
Make sure it exports a plugin property, conforming with the GraphQLTypesGeneratorPlugin interface.`,
            );
        }
        const config = pluginEntry[2];

        if (isConfigurablePlugin(plugin)) {
            configurablePlugins.push([plugin, config]);
        }
        if (isFileSystemPlugin(plugin)) {
            filesystemPlugins.push([plugin, config]);
        }
        if (isGraphQLPlugin(plugin)) {
            graphQLPlugins.push([plugin, config]);
        }
        if (isTypeScriptPlugin(plugin)) {
            typescriptPlugins.push([plugin, config]);
        }
    }

    configurablePlugins.forEach(([plugin, config]) => {
        plugin.configure(context, config);
    });

    await Promise.all(
        filterMap(filesystemPlugins, filterTupleEntry(isFileSystemInitialPhasePlugin), ([plugin, config]) =>
            plugin.filesystem.initial(context, config),
        ),
    );

    const visitors = filterMap(graphQLPlugins, filterTupleEntry(isGraphQLCollectorPlugin), ([plugin, config]) =>
        plugin.graphql.collect(context, config),
    );

    const validators = filterMap(graphQLPlugins, filterTupleEntry(isGraphQLValidatorPlugin), ([plugin, config]) =>
        plugin.graphql.validator(context, config),
    ).reduce((result, validators) => result.concat(validators), []);

    visitor(context, visitors, validators);

    await Promise.all(
        filterMap(filesystemPlugins, filterTupleEntry(isFileSystemCollectedPhasePlugin), ([plugin, config]) =>
            plugin.filesystem.collected(context, config),
        ),
    );

    await Promise.all(
        filterMap(typescriptPlugins, filterTupleEntry(isTypeScriptTransformPlugin), ([plugin, config]) =>
            plugin.typescript.transform(context, config),
        ),
    );

    await Promise.all(
        filterMap(filesystemPlugins, filterTupleEntry(isFileSystemFinalizedPhasePlugin), ([plugin, config]) =>
            plugin.filesystem.finalized(context, config),
        ),
    );
}
