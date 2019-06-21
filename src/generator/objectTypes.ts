import {
    FieldDefinitionNode,
    GraphQLError,
    InputObjectTypeDefinitionNode,
    ObjectTypeDefinitionNode,
    ObjectTypeExtensionNode,
} from 'graphql';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { printSourceFile } from 'graphql-types-generator/generator/printSoruceFile';
import { fieldTypeMapper, collectFieldDefinition } from 'graphql-types-generator/generator/fieldMapper';
import { SourceFileDependencyMap, withJSDoc } from 'graphql-types-generator/generator/utilities';
import { join, relative } from 'path';
import * as ts from 'typescript';

export function generateObjectTypeDefinitions(context: GeneratorContext): Promise<void> {
    return Promise.all(
        Array.from(context.getTypeDefinitionMap().entries()).map(entry => {
            const [sourcePath, defNodes] = entry;
            const relativePath = relative(context.inputPath.toString(), sourcePath);
            const resultFilePath = join(context.outputPath.toString(), relativePath) + '.ts';
            const dependencyMap: SourceFileDependencyMap = new Map();
            const tsNodes: ts.Node[] = [];

            defNodes.forEach(node => {
                const typeName = node.name.value;
                const fieldDefinitions = context.objectTypeFieldDefinitions.get(typeName) || [];
                const fieldResolvers = context.fieldResolversMap.get(typeName) || [];

                const interfaceDecl = withJSDoc(
                    ts.createInterfaceDeclaration(
                        undefined,
                        [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                        ts.createIdentifier(typeName),
                        undefined,
                        node.kind === 'ObjectTypeDefinition' && node.interfaces != null
                            ? node.interfaces.map(i => {
                                  fieldTypeMapper(context, i, dependencyMap);
                                  return ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
                                      ts.createExpressionWithTypeArguments(
                                          undefined,
                                          ts.createIdentifier(i.name.value),
                                      ),
                                  ]);
                              })
                            : undefined,
                        fieldDefinitions.map(fieldDef =>
                            withJSDoc(
                                ts.createPropertySignature(
                                    undefined,
                                    ts.createIdentifier(fieldDef.name.value),
                                    undefined,
                                    fieldTypeMapper(context, fieldDef.type, dependencyMap),
                                    undefined,
                                ),
                                fieldDef.description,
                            ),
                        ),
                    ),
                    node.description,
                );

                tsNodes.push(interfaceDecl);

                const utilPath = join(context.importPrefix, 'index');
                if (fieldResolvers.length > 0) {
                    const importNames = dependencyMap.get(utilPath) || new Set();
                    importNames.add('Resolver');
                    dependencyMap.set(utilPath, importNames);

                    const resolversMap = new Map<string, [string, FieldDefinitionNode]>();

                    fieldResolvers.forEach(field => {
                        const fieldName = field.name.value;
                        const resolverTypeIdentifier =
                            typeName + fieldName[0].toUpperCase() + fieldName.slice(1) + 'Resolver';

                        resolversMap.set(fieldName, [resolverTypeIdentifier, field]);

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
                                        ts.createTypeReferenceNode(ts.createIdentifier(typeName), undefined),
                                        ts.createTypeReferenceNode(
                                            ts.createIdentifier(resolverTypeArgsIdentifier),
                                            undefined,
                                        ),
                                        resolverResultType,
                                    ]),
                                ),
                                field.description,
                            ),
                        );
                    });

                    tsNodes.push(
                        ts.createInterfaceDeclaration(
                            undefined,
                            [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                            ts.createIdentifier(typeName + 'Resolvers'),
                            undefined,
                            undefined,
                            Array.from(resolversMap.entries()).map(e => {
                                return withJSDoc(
                                    ts.createPropertySignature(
                                        undefined,
                                        e[0],
                                        undefined,
                                        ts.createTypeReferenceNode(ts.createIdentifier(e[1][0]), undefined),
                                        undefined,
                                    ),
                                    e[1][1].description,
                                );
                            }),
                        ),
                    );
                }
            });

            tsNodes.push(ts.createNode(ts.SyntaxKind.EndOfFileToken));

            dependencyMap.delete(join(context.importPrefix, relativePath));

            return printSourceFile(context, resultFilePath, {
                dependencies: dependencyMap,
                nodes: tsNodes,
            });
        }),
    ).then(_ => void 0);
}

export function collectTypeDefinitions(context: GeneratorContext, defNode: ObjectTypeDefinitionNode): void {
    const typeName = defNode.name.value;
    const existingType = context.objectTypeDefinitionsMap.get(typeName);
    if (existingType != null) {
        existingType.push(defNode);
    } else {
        context.objectTypeDefinitionsMap.set(typeName, [defNode]);
    }
    const resolversDirective = getResolversDirective(context, defNode);
    if (defNode.fields != null) {
        defNode.fields.forEach(field => collectFieldDefinition(context, typeName, field, resolversDirective));
    }
}

export interface ResolversDirective {
    importPath: string;
}
function getResolversDirective(
    context: GeneratorContext,
    defNode: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
): Maybe<ResolversDirective> {
    const directive =
        defNode.directives == null ? null : defNode.directives.find(dir => dir.name.value === 'resolvers') || null;

    if (directive == null) {
        return null;
    } else {
        if (
            directive.arguments == null ||
            directive.arguments.length === 0 ||
            directive.arguments[0].name.value !== 'importPath'
        ) {
            context.errors.push(new GraphQLError('Missing required importPath argument', directive));
            return null;
        } else {
            const importPath = directive.arguments[0].value;
            if (importPath.kind !== 'StringValue') {
                context.errors.push(new GraphQLError('importPath argument must be a string', directive));
                return null;
            } else {
                return {
                    importPath: importPath.value,
                };
            }
        }
    }
}

export function collectTypeExtensions(context: GeneratorContext, defNode: ObjectTypeExtensionNode): void {
    const resolversDirective = getResolversDirective(context, defNode);
    const typeName = defNode.name.value;
    if (defNode.fields != null) {
        defNode.fields.forEach(field => collectFieldDefinition(context, typeName, field, resolversDirective));
    }
}

export function collectInputObjectTypeDefinitions(
    context: GeneratorContext,
    defNode: InputObjectTypeDefinitionNode,
): void {
    const typeName = defNode.name.value;
    const existingType = context.inputObjectTypeDefinitionsMap.get(typeName);
    if (existingType != null) {
        existingType.push(defNode);
    } else {
        context.inputObjectTypeDefinitionsMap.set(typeName, [defNode]);
    }
    if (defNode.fields != null) {
        defNode.fields.forEach(field => collectFieldDefinition(context, typeName, field, null));
    }
}
