import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import * as ts from 'typescript';
import {
    ResolverModuleTransformObject,
    FieldResolverTransformObject,
} from 'graphql-types-generator/generator/resolverType';
import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from '../plugin';
import { collectInputObjectTypeDefinitions, collectTypeDefinitions, collectTypeExtensions } from 'graphql-types-generator/generator/objectTypes';
import { collectInterfaceDefinitions } from 'graphql-types-generator/generator/interfaceTypes';
import { collectOperationType } from '../collectOperationType';

interface ResolverPluginConfig {}

export const plugin: GraphQLTypesGeneratorPlugin<ResolverPluginConfig> = {
    config: null as any,
    graphql: {
        collect: (context) => ({
            InputObjectTypeDefinition(node) {
                collectInputObjectTypeDefinitions(context, node);
            },
            InterfaceTypeDefinition(node) {
                collectInterfaceDefinitions(context, node);
            },
            ObjectTypeDefinition(node) {
                collectTypeDefinitions(context, node);
            },
            ObjectTypeExtension(node) {
                collectTypeExtensions(context, node);
            },
            OperationTypeDefinition(node) {
                collectOperationType(context, node);
            },
        }),
    },
    // typescript: transformResolvers,
    kind: GraphQLTypesPluginKind.TypeScript,
};

function createResovlerFunction(property: FieldResolverTransformObject) {
    return ts.createPropertyAssignment(
        ts.createStringLiteral(property.resolverName),
        ts.createArrowFunction(
            undefined,
            undefined,
            [
                ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('context')),
                ts.createParameter(
                    undefined,
                    undefined,
                    undefined,
                    ts.createIdentifier(property.parentTypeName[0].toLowerCase() + property.parentTypeName.slice(1)),
                ),
                ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('args')),
            ],
            undefined,
            ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.createBlock(
                [
                    ts.createThrow(
                        ts.createNew(ts.createIdentifier('Error'), undefined, [
                            ts.createStringLiteral('Not implemented yet!'),
                        ]),
                    ),
                ],
                true,
            ),
        ),
    );
}

export function transformResolvers(_gContext: GeneratorContext, transformObject: ResolverModuleTransformObject) {
    return (context: ts.TransformationContext) => {
        const resolverProperties: Map<string, ts.PropertyAssignment> = new Map();
        let resolversVariableFound = false;
        let resolversTypeImportFound = false;

        return (rootNode: ts.Node): ts.Node => {
            const visit = (node: ts.Node): ts.Node => {
                switch (true) {
                    case node.parent == null &&
                        ts.isVariableDeclaration(node) &&
                        ts.isIdentifier(node.name) &&
                        node.name.text === 'resolvers':
                        resolversVariableFound = true;
                        return ts.visitEachChild(node, visitResolversDeclaration, context);
                    case node.parent == null &&
                        ts.isImportDeclaration(node) &&
                        node.importClause != null &&
                        ts.isStringLiteral(node.moduleSpecifier) &&
                        node.moduleSpecifier.text === transformObject.importPath:
                        resolversTypeImportFound = true;
                        return ts.visitEachChild(node, visitResolversTypeImport, context);
                    default:
                        return ts.visitEachChild(node, visit, context);
                }
            };

            let result = ts.visitNode(rootNode, visit);

            if (!resolversTypeImportFound) {
                const resolversTypeImport = ts.createImportDeclaration(
                    undefined,
                    undefined,
                    ts.createImportClause(
                        undefined,
                        ts.createNamedImports([
                            ts.createImportSpecifier(
                                undefined,
                                ts.createIdentifier(transformObject.resolversTypeIdentifier),
                            ),
                        ]),
                    ),
                    ts.createStringLiteral(transformObject.importPath),
                );

                result = ts.updateSourceFileNode(result as ts.SourceFile, [
                    resolversTypeImport,
                    ...(result as ts.SourceFile).statements,
                ]);
            }

            if (!resolversVariableFound) {
                const resolvers = ts.createVariableStatement(
                    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                    ts.createVariableDeclarationList(
                        [
                            ts.createVariableDeclaration(
                                ts.createIdentifier('resolvers'),
                                ts.createTypeReferenceNode(
                                    ts.createIdentifier(transformObject.resolversTypeIdentifier),
                                    undefined,
                                ),
                                ts.createObjectLiteral(
                                    transformObject.resolvers.map(property => createResovlerFunction(property)),
                                    true,
                                ),
                            ),
                        ],
                        ts.NodeFlags.Const,
                    ),
                );

                result = ts.updateSourceFileNode(result as ts.SourceFile, [
                    ...(result as ts.SourceFile).statements,
                    resolvers,
                ]);
            }

            return result;

            function visitResolversTypeImport(node: ts.Node): ts.VisitResult<ts.Node> {
                switch (node.kind) {
                    case ts.SyntaxKind.NamedImports:
                        if (ts.isNamedImports(node)) {
                            const resolversType = node.elements.find(
                                e => e.name.text === transformObject.resolversTypeIdentifier,
                            );
                            if (resolversType == null) {
                                return ts.updateNamedImports(node, [
                                    ...node.elements,
                                    ts.createImportSpecifier(
                                        undefined,
                                        ts.createIdentifier(transformObject.resolversTypeIdentifier),
                                    ),
                                ]);
                            }
                        }
                        return ts.visitEachChild(node, visitResolversTypeImport, context);
                    default:
                        return ts.visitEachChild(node, visitResolversTypeImport, context);
                }
            }

            function visitResolversDeclaration(node: ts.Node): ts.VisitResult<ts.Node> {
                switch (node.kind) {
                    case ts.SyntaxKind.TypeReference:
                        if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
                            if (node.typeName.text !== transformObject.resolversTypeIdentifier) {
                                return ts.updateTypeReferenceNode(
                                    node,
                                    ts.createIdentifier(transformObject.resolversTypeIdentifier),
                                    undefined,
                                );
                            }
                        }
                        return ts.visitEachChild(node, visitResolversDeclaration, context);
                    case ts.SyntaxKind.ObjectLiteralExpression:
                        return visitResolversObject(node);
                    default:
                        return ts.visitEachChild(node, visitResolversDeclaration, context);
                }
            }

            function visitResolverProperties(node: ts.Node): ts.VisitResult<ts.Node>{
                switch (node.kind) {
                    case ts.SyntaxKind.PropertyAssignment:
                        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
                            resolverProperties.set(node.name.text, node);
                        }
                }
                return ts.visitEachChild(node, visitResolverProperties, context);
            }

            function visitResolversObject(node: ts.Node): ts.VisitResult<ts.Node> {
                const result = ts.visitEachChild(node, visitResolverProperties, context);
                const missingResolvers = transformObject.resolvers.filter(r => !resolverProperties.has(r.resolverName));
                const resolvers = missingResolvers.map(createResovlerFunction);
                return ts.updateObjectLiteral(result as ts.ObjectLiteralExpression, [
                    ...(result as ts.ObjectLiteralExpression).properties,
                    ...resolvers,
                ].sort((a: ts.ObjectLiteralElementLike, b: ts.ObjectLiteralElementLike) => {
                    const aName = a.name == null ? '' : ts.isIdentifier(a.name) || ts.isNumericLiteral(a.name) || ts.isStringLiteral(a.name) ? a.name.text : ts.isComputedPropertyName(a.name) ? String(a.name.expression) : a.name;
                    const bName = b.name == null ? '' : ts.isIdentifier(b.name) || ts.isNumericLiteral(b.name) || ts.isStringLiteral(b.name) ? b.name.text : ts.isComputedPropertyName(b.name) ? String(b.name.expression) : b.name;

                    if (aName > bName) {
                        return 1;
                    } else if (aName < bName) {
                        return -1;
                    } else {
                        return 0;
                    }
                }));
            }
        };
    };
}
