import { SourceFileDependencyMap, withJSDoc } from 'graphql-types-generator/generator/utilities';
import { GeneratorContext, DecoratedFieldDefinitionNode } from 'graphql-types-generator/generator/GeneratorContext';
import { SourceFileContent } from 'graphql-types-generator/generator/printSoruceFile';
import * as ts from 'typescript';
import { basename } from 'path';
import { fieldTypeMapper } from 'graphql-types-generator/generator/fieldMapper';

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
    const declaringType = basename(field.loc!.source.name, '.graphql');
    const fieldName = field.name.value;
    const fieldTypeName = fieldName[0].toUpperCase() + fieldName.slice(1);
    const declaringTypeName = (declaringType === parentTypeName
        ? parentTypeName
        : declaringType + parentTypeName) as DeclaringType;
    const resolverTypeIdentifier = (declaringTypeName + fieldTypeName + 'Resolver') as ResolverIdentifier;

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
    context.fieldResolversMap.forEach((fieldNodes, typeName) => {
        console.log(typeName);
        fieldNodes.forEach(field => {
            const resolvers = field.__gtg.resolvers;
            const importPath = resolvers == null ? field.loc!.source.name : resolvers.importPath;
            console.log('  - ' + field.name.value + ' (' + importPath + ')');
        });
    });
}
