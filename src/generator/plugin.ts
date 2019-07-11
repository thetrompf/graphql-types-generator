import { ASTKindToNode } from 'graphql/language/ast';
import { Visitor as GraphQLVisitor } from 'graphql/language/visitor';
import { SDLValidationRule } from 'graphql/validation/ValidationContext';
import { GeneratorContext } from 'graphql-types-generator/GeneratorContext';
import * as ts from 'typescript';
import { GraphQLTypesGeneratorConfig } from './config';

export enum GraphQLTypesPluginKind {
    TypeScript,
}

export interface GraphQLTypesGeneratorPluginConfig {}

export interface GraphQLTypesSDLCollector<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    collect(genContext: GeneratorContext, config: TPluginConfig): GraphQLVisitor<ASTKindToNode>;
}

export interface GraphQLTypesSDLValidator<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    validator(genContext: GeneratorContext, config: TPluginConfig): SDLValidationRule[];
}

export interface GraphQLTypesTypeScriptTransformer<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    transform(genContext: GeneratorContext, config: TPluginConfig): ts.TransformerFactory<ts.Node>;
}

export interface GraphQLTypesFileSystemIntialPhase<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    initial(genContext: GeneratorContext, config: TPluginConfig): Promise<void>;
}

export interface GraphQLTypesFileSystemCollectedPhase<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    collected(genContext: GeneratorContext, config: TPluginConfig): Promise<void>;
}

export interface GraphQLTypesFileSystemFinalizedPhase<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    finalized(genContext: GeneratorContext, config: TPluginConfig): Promise<void>;
}

export interface GraphQLTypesConfigurablePlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    configure: GraphQLTypesConfigure<TPluginConfig>;
}

export type GraphQLTypesFileSystemPhasePlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig> = Partial<
    GraphQLTypesFileSystemIntialPhase<TPluginConfig>
> &
    Partial<GraphQLTypesFileSystemCollectedPhase<TPluginConfig>> &
    Partial<GraphQLTypesFileSystemFinalizedPhase<TPluginConfig>>;

export interface GraphQLTypesFileSystemPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    filesystem: GraphQLTypesFileSystemPhasePlugin<TPluginConfig>;
}

export interface GraphQLTypesFileSystemInitialPhasePlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    filesystem: GraphQLTypesFileSystemIntialPhase<TPluginConfig>;
}

export interface GraphQLTypesFileSystemCollectedPhasePlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    filesystem: GraphQLTypesFileSystemCollectedPhase<TPluginConfig>;
}

export interface GraphQLTypesFileSystemFinalizedPhasePlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    filesystem: GraphQLTypesFileSystemFinalizedPhase<TPluginConfig>;
}

export interface GraphQLTypesConfigure<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    (genContet: GeneratorContext, config: unknown | TPluginConfig): void;
}

export type GraphQLTypesSDLPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig> = Partial<
    GraphQLTypesSDLCollector<TPluginConfig>
> &
    Partial<GraphQLTypesSDLValidator<TPluginConfig>>;
export type GraphQLTypesTypeScriptPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig> = Partial<
    GraphQLTypesTypeScriptTransformer<TPluginConfig>
>;
export type GraphQLTypesGeneratorPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig> =
    | GraphQLTypesGeneratorPluginBase<TPluginConfig>
    | GraphQLTypesGeneratorTypeScriptPlugin<TPluginConfig>;

export interface GraphQLTypesGeneratorPluginModule<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>;
}

export interface GraphQLTypesSDLCollectorPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    graphql: GraphQLTypesSDLCollector<TPluginConfig>;
}

export interface GraphQLTypesSDLValidatorPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    graphql: GraphQLTypesSDLValidator<TPluginConfig>;
}

export interface GraphQLTypesGeneratorPluginBase<TPluginConfig = GraphQLTypesGeneratorPluginConfig> {
    /**
     * Jytte
     */
    configure?: GraphQLTypesConfigure<TPluginConfig>;
    filesystem?: GraphQLTypesFileSystemPhasePlugin<TPluginConfig>;
    graphql?: GraphQLTypesSDLPlugin<TPluginConfig>;
    kind: GraphQLTypesPluginKind;
}

export interface GraphQLTypesGeneratorTypeScriptPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    kind: GraphQLTypesPluginKind.TypeScript;
    typescript: GraphQLTypesTypeScriptPlugin<TPluginConfig>;
}

export interface GraphQLTypesGraphQLPlugin<TPluginConfig = GraphQLTypesGeneratorPluginConfig>
    extends GraphQLTypesGeneratorPluginBase<TPluginConfig> {
    graphql: GraphQLTypesSDLPlugin<TPluginConfig>;
}

export interface GraphQLTypesTypeScriptTransformerPlugin<TPluginConfig = GraphQLTypesGeneratorConfig>
    extends GraphQLTypesGeneratorTypeScriptPlugin<TPluginConfig> {
    typescript: GraphQLTypesTypeScriptTransformer<TPluginConfig>;
}

export function isConfigurablePlugin<TPluginConfig extends {}>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesConfigurablePlugin<TPluginConfig> {
    return typeof plugin.configure === 'function';
}

export function isGraphQLPlugin<TPlugin extends GraphQLTypesGeneratorPlugin>(
    plugin: TPlugin,
): plugin is TPlugin & GraphQLTypesGraphQLPlugin {
    return typeof plugin.graphql === 'object' && plugin.graphql != null;
}

export function isGraphQLCollectorPlugin<TPluginConfig extends {}>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesSDLCollectorPlugin<TPluginConfig> {
    return isGraphQLPlugin(plugin) && typeof plugin.graphql.collect === 'function';
}

export function isGraphQLValidatorPlugin<TPluginConfig extends {}>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesSDLValidatorPlugin<TPluginConfig> {
    return isGraphQLPlugin(plugin) && typeof plugin.graphql.validator === 'function';
}

export function isFileSystemPlugin<TPlugin extends GraphQLTypesGeneratorPlugin>(
    plugin: TPlugin,
): plugin is TPlugin & GraphQLTypesFileSystemPlugin {
    return typeof plugin.filesystem === 'object' && plugin.filesystem != null;
}

export function isFileSystemInitialPhasePlugin<TPluginConfig extends GraphQLTypesGeneratorPluginConfig>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesFileSystemInitialPhasePlugin<TPluginConfig> {
    return isFileSystemPlugin(plugin) && typeof plugin.filesystem.initial === 'function';
}

export function isFileSystemCollectedPhasePlugin<TPluginConfig extends GraphQLTypesGeneratorPluginConfig>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesFileSystemCollectedPhasePlugin<TPluginConfig> {
    return isFileSystemPlugin(plugin) && typeof plugin.filesystem.collected === 'function';
}

export function isFileSystemFinalizedPhasePlugin<TPluginConfig extends GraphQLTypesGeneratorPluginConfig>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesFileSystemFinalizedPhasePlugin<TPluginConfig> {
    return isFileSystemPlugin(plugin) && typeof plugin.filesystem.finalized === 'function';
}

export function isTypeScriptPlugin<TPluginConfig extends GraphQLTypesGeneratorPluginConfig>(
    plugin: GraphQLTypesGeneratorPlugin<TPluginConfig>,
): plugin is GraphQLTypesGeneratorTypeScriptPlugin {
    return typeof (plugin as any).typescript === 'object' && (plugin as any).typescript != null;
}

export function isTypeScriptTransformPlugin<TPluginConfig extends GraphQLTypesGeneratorPluginConfig>(
    plugin: GraphQLTypesGeneratorTypeScriptPlugin<TPluginConfig>,
): plugin is GraphQLTypesTypeScriptTransformerPlugin<TPluginConfig> {
    return typeof plugin.typescript.transform === 'function';
}
