import { SourceFileDependencyMap, withJSDoc } from 'graphql-types-generator/generator/utilities';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { SourceFileContent } from 'graphql-types-generator/generator/printSoruceFile';
import * as ts from 'typescript';

`/**
 * Resolver utility type for constructing
 * a GraphQL resolver methods \`interface\`.
 */
export type Resolver<TParent, TArgs, TResult> = (parent: TParent, args: TArgs, info: GraphQLResolveInfo) => TResult;
`;
export const generateResolverType = (context: GeneratorContext): SourceFileContent => {

    const dependencies: SourceFileDependencyMap = new Map(context.context == null ? [
        ['graphql', new Set(['GraphQLResolveInfo'])],
    ] : [
        ['graphql', new Set(['GraphQLResolveInfo'])],
        [context.context.importPath, new Set([context.context.importName])],
    ]);

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
        )
    ];

    if (context.context == null) {
        nodes.unshift(
            ts.createTypeAliasDeclaration(
                undefined,
                [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                'Context',
                undefined,
                ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            )
        );
    }

    return {
        dependencies,
        nodes,
    }
}

export async function updateResolvers(context: GeneratorContext) {
    context.fieldResolversMap.forEach((fieldNodes, typeName) => {
        console.log(typeName);
        fieldNodes.forEach(field => {
            const resolvers = field.__gtg.resolvers;
            const importPath = resolvers == null ? field.loc!.source.name : resolvers.importPath;
            console.log('  - ' + field.name.value + ' (' + importPath + ')' );
        })
    })
}
