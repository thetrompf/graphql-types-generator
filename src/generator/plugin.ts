import { ASTKindToNode } from 'graphql/language/ast';
import { Visitor as GraphQLVisitor } from 'graphql/language/visitor';
import { ValidationRule } from 'graphql/validation/ValidationContext';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import * as ts from 'typescript';

export enum GraphQLTypesPluginKind {
    TypeScript,
}

export interface GraphQLTypesSDLCollector<TPluginConfig = any> {
    collect(genContext: GeneratorContext, config: TPluginConfig): GraphQLVisitor<ASTKindToNode>;
}

export interface GraphQLTypesSDLValidator<TPluginConfig = any> {
    validators(genContext: GeneratorContext, config: TPluginConfig): ValidationRule[];
}

export interface GraphQLTypesTypeScriptTransformer<TPluginConfig = any> {
    transform(genContext: GeneratorContext, config: TPluginConfig): ts.TransformerFactory<ts.Node>;
}

export interface GraphQLTypesFileSystemIntialPhase<TPluginConfig = any> {
    initial(genContext: GeneratorContext, config: TPluginConfig): Promise<void>;
}

export interface GraphQLTypesFileSystemCollectedPhase<TPluginConfig = any> {
    collected(genContext: GeneratorContext, config: TPluginConfig): Promise<void>;
}

export interface GraphQLTypesFileSystemFinalizedPhase<TPluginConfig = any> {
    finalized(genContext: GeneratorContext, config: TPluginConfig): Promise<void>;
}

export interface GraphQLTypesConfigurable<TPluginConfig = any> {
    config: TPluginConfig;
    configure: GraphQLTypesConfig<TPluginConfig>;
    kind: GraphQLTypesPluginKind;
}

export type GraphQLTypesFileSystemPhasePlugin<TPluginConfig = any> = Partial<GraphQLTypesFileSystemIntialPhase<TPluginConfig>> &
    Partial<GraphQLTypesFileSystemCollectedPhase<TPluginConfig>> &
    Partial<GraphQLTypesFileSystemFinalizedPhase<TPluginConfig>>;

export type GraphQLTypesFileSystemPlugin<TPluginConfig = any> = {
    config: TPluginConfig;
    filesytem: GraphQLTypesFileSystemPhasePlugin<TPluginConfig>;
    kind: GraphQLTypesPluginKind;
}

export interface GraphQLTypesConfig<TPluginConfig> {
    (genContet: GeneratorContext, config: unknown | TPluginConfig): void;
}

export type GraphQLTypesSDLPlugin<TPluginConfig = any> = Partial<GraphQLTypesSDLCollector<TPluginConfig>> & Partial<GraphQLTypesSDLValidator<TPluginConfig>>;
export type GraphQLTypesTypeScriptPlugin<TPluginConfig = any> = GraphQLTypesTypeScriptTransformer<TPluginConfig>;
export type GraphQLTypesGeneratorPlugin<TPluginConfig = any> = GraphQLTypesGeneratorPluginBase<TPluginConfig> | GraphQLTypesGeneratorTypescriptPlugin<TPluginConfig>;

export interface GraphQLTypesGeneratorPluginBase<TPluginConfig = any> {
    config: TPluginConfig;
    configure?: GraphQLTypesConfig<TPluginConfig>;
    filesytem?: GraphQLTypesFileSystemPhasePlugin<TPluginConfig>;
    graphql?: GraphQLTypesSDLPlugin<TPluginConfig>;
    kind: GraphQLTypesPluginKind;
}

export interface GraphQLTypesGeneratorTypescriptPlugin<TPluginConfig = any> {
    config: TPluginConfig;
    configure?: GraphQLTypesConfig<TPluginConfig>;
    filesytem?: GraphQLTypesFileSystemPhasePlugin<TPluginConfig>;
    graphql?: GraphQLTypesSDLPlugin<TPluginConfig>;
    kind: GraphQLTypesPluginKind.TypeScript;
    typescript: GraphQLTypesTypeScriptPlugin<TPluginConfig>;
}

export interface GraphQLTypesGraphQLPlugin<TPluginConfig = any> {
    config: TPluginConfig;
    graphql: GraphQLTypesSDLPlugin<TPluginConfig>;
    kind: GraphQLTypesPluginKind;
}

export function isConfigurablePlugin<TPlugin extends GraphQLTypesGeneratorPlugin>(
    plugin: TPlugin,
): plugin is TPlugin & GraphQLTypesConfigurable {
    return typeof plugin.configure === 'function';
}

export function isGraphQLPlugin<TPlugin extends GraphQLTypesGeneratorPlugin>(
    plugin: TPlugin,
): plugin is TPlugin & GraphQLTypesGraphQLPlugin {
    return typeof plugin.graphql === 'object' && plugin.graphql != null;
}

export function isFileSytemPlugin<TPlugin extends GraphQLTypesGeneratorPlugin>(
    plugin: TPlugin,
): plugin is TPlugin & GraphQLTypesFileSystemPlugin {
    return typeof plugin.filesytem === 'object' && plugin.filesytem != null;
}
