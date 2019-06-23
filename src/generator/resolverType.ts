import { exists as existsNode, readFile as readFileNode } from 'fs';
import { SourceFileDependencyMap, withJSDoc } from 'graphql-types-generator/generator/utilities';
import { GeneratorContext, DecoratedFieldDefinitionNode } from 'graphql-types-generator/generator/GeneratorContext';
import { SourceFileContent, printSourceFile } from 'graphql-types-generator/generator/printSoruceFile';
import { fieldTypeMapper } from 'graphql-types-generator/generator/fieldMapper';
import { transformResolvers } from 'graphql-types-generator/generator/transformers/resolvers';
import { join } from 'path';
import * as ts from 'typescript';
import { promisify } from 'util';

const exists = promisify(existsNode);
const readFile = promisify(readFileNode);

export type DeclaringType = string & { '': 'DeclaringType' };
export type ResolverIdentifier = string & { '': 'ResolverIdentifier' };
export type ResolversMap = Map<DeclaringType, [ResolverIdentifier, DecoratedFieldDefinitionNode][]>;

`/**
 * Resolver utility type for constructing
 * a GraphQL resolver methods \`interface\`.
 */
export type Resolver<TParent, TArgs, TResult> = (parent: TParent, args: TArgs, info: GraphQLResolveInfo) => TResult;
`;
export const generateResolverType = (context: GeneratorContext): SourceFileContent => {
    const dependencies: SourceFileDependencyMap = new Map(
        context.context == null
            ? [['graphql', new Set(['GraphQLResolveInfo'])]]
            : [
                  ['graphql', new Set(['GraphQLResolveInfo'])],
                  [context.context.importPath, new Set([context.context.importName])],
              ],
    );

    const nodes = [
        withJSDoc(
            ts.createTypeAliasDeclaration(
                undefined,
                [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                ts.createIdentifier('Resolver'),
                [
                    ts.createTypeParameterDeclaration(ts.createIdentifier('TParent'), undefined, undefined),
                    ts.createTypeParameterDeclaration(ts.createIdentifier('TArgs'), undefined, undefined),
                    ts.createTypeParameterDeclaration(ts.createIdentifier('TResult'), undefined, undefined),
                ],
                ts.createFunctionTypeNode(
                    undefined,
                    [
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('context'),
                            undefined,
                            ts.createTypeReferenceNode(ts.createIdentifier('Context'), undefined),
                            undefined,
                        ),
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('parent'),
                            undefined,
                            ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
                            undefined,
                        ),
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('args'),
                            undefined,
                            ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
                            undefined,
                        ),
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('info'),
                            undefined,
                            ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
                            undefined,
                        ),
                    ],
                    ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
                ),
            ),
            `Resolver utility type for constructing
a GraphQL resolver methods \`interface\`.`,
        ),
    ];

    if (context.context == null) {
        nodes.unshift(
            ts.createTypeAliasDeclaration(
                undefined,
                [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                'Context',
                undefined,
                ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ),
        );
    }

    return {
        dependencies,
        nodes,
    };
};

export function generateResolverTypes(tsNodes: ts.Node[], resolversMap: ResolversMap) {
    Array.from(resolversMap.entries()).map(([declaringType, fields]) => {
        tsNodes.push(
            ts.createInterfaceDeclaration(
                undefined,
                [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                ts.createIdentifier(declaringType + 'Resolvers'),
                undefined,
                undefined,
                fields.map(([resolverIdentifier, fieldNode]) =>
                    withJSDoc(
                        ts.createPropertySignature(
                            undefined,
                            fieldNode.name.value,
                            undefined,
                            ts.createTypeReferenceNode(ts.createIdentifier(resolverIdentifier), undefined),
                            undefined,
                        ),
                        fieldNode.description,
                    ),
                ),
            ),
        );
    });
}

/**
 * Track which types and source files the resolvers are declared in.
 * This is an internal utility function,
 * which populates the `resovlersMap`, with the needed information
 * for generating the "PartialTypes" resolvers.
 * @example
 * ```graphql
 * extend type Query resolvers(importPath: "resolvers/Viewer/Query") {
 *   viewer: Viewer! resolve
 * }
 * ```
 * ```ts
 * // Will generate the following types
 * export type ViewerQueryViewerResolver = Reslver<Query, Args, Viewer>;
 * export interface ViewerQueryResolvers {
 *    viewer: ViewerQueryViewerResolver;
 * }
 * ```
 */
export function trackResolvers(
    context: GeneratorContext,
    field: DecoratedFieldDefinitionNode,
    parentTypeName: string,
    tsNodes: ts.Node[],
    dependencyMap: SourceFileDependencyMap,
    resolversMap: ResolversMap,
): void {
    const declaringTypeName = context.getDeclaringTypeName(field);
    const resolverTypeIdentifier = context.getResolverTypeIdentifier(field);

    const currentDeclaredResolvers = resolversMap.get(declaringTypeName) || [];
    currentDeclaredResolvers.push([resolverTypeIdentifier, field]);
    resolversMap.set(declaringTypeName, currentDeclaredResolvers);

    const resolverTypeArgsIdentifier = resolverTypeIdentifier + 'Args';
    if (field.arguments != null && field.arguments.length > 0) {
        tsNodes.push(
            ts.createInterfaceDeclaration(
                undefined,
                [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                ts.createIdentifier(resolverTypeArgsIdentifier),
                undefined,
                undefined,
                field.arguments.map(arg =>
                    ts.createPropertySignature(
                        undefined,
                        ts.createIdentifier(arg.name.value),
                        undefined,
                        fieldTypeMapper(context, arg.type, dependencyMap),
                        undefined,
                    ),
                ),
            ),
        );
    } else {
        tsNodes.push(
            ts.createTypeAliasDeclaration(
                undefined,
                [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                ts.createIdentifier(resolverTypeArgsIdentifier),
                undefined,
                ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ),
        );
    }

    const resolverResultType = fieldTypeMapper(context, field.type, dependencyMap);

    tsNodes.push(
        withJSDoc(
            ts.createTypeAliasDeclaration(
                undefined,
                [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                ts.createIdentifier(resolverTypeIdentifier),
                undefined,
                ts.createTypeReferenceNode(ts.createIdentifier('Resolver'), [
                    ts.createTypeReferenceNode(ts.createIdentifier(parentTypeName), undefined),
                    ts.createTypeReferenceNode(ts.createIdentifier(resolverTypeArgsIdentifier), undefined),
                    resolverResultType,
                ]),
            ),
            field.description,
        ),
    );
}

export async function updateResolvers(context: GeneratorContext) {
    type ResolverOutputPath = string & { '': 'ResolverOutputPath' };

    const resolverUpdaterMap = new Map<
        ResolverOutputPath,
        {
            importPath: string;
            parentTypeName: string;
            resolverName: string;
            resolverTypeIdentifier: string;
        }[]
    >();

    context.fieldResolversMap.forEach(fieldNodes => {
        fieldNodes.forEach(field => {
            const { parentTypeName, resolvers } = field.__gtg;
            const importPath = join(
                context.resolversImportPrefix,
                resolvers == null ? parentTypeName : resolvers.importPath,
            );
            const outputPath = join(
                context.resolversOutputPath.toString(),
                resolvers == null ? parentTypeName : resolvers.importPath,
            ) as ResolverOutputPath;

            const updateEntities = resolverUpdaterMap.get(outputPath) || [];
            const resolverTypeIdentifier = context.getResolverTypeIdentifier(field);
            updateEntities.push({
                importPath: importPath,
                parentTypeName: parentTypeName,
                resolverName: field.name.value,
                resolverTypeIdentifier: resolverTypeIdentifier,
            });
            resolverUpdaterMap.set(outputPath, updateEntities);
        });
    });

    return Array.from(resolverUpdaterMap.entries()).reduce(async (carry, [outputPath, _entries]) => {
        await carry;
        const sourceFile = await getTypescriptSourceFile(context, outputPath + '.ts');

        const result = ts.transform(sourceFile, [transformResolvers(context)]);

        return Promise.all(result.transformed.map(source => printSourceFile(source as ts.SourceFile))).then(
            _ => void 0,
        );
    }, Promise.resolve());
}

async function getTypescriptSourceFile(context: GeneratorContext, outputPath: string) {
    const sourceFileExists = await exists(outputPath);
    const sourceContent = sourceFileExists ? await readFile(outputPath) : '';
    return ts.createSourceFile(
        outputPath,
        sourceContent.toString(),
        context.targetLanguageVersion,
        undefined,
        ts.ScriptKind.TS,
    );
}
