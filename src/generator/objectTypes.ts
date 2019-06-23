import {
    GraphQLError,
    InputObjectTypeDefinitionNode,
    ObjectTypeDefinitionNode,
    ObjectTypeExtensionNode,
} from 'graphql';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { printSourceContent } from 'graphql-types-generator/generator/printSoruceFile';
import { fieldTypeMapper, collectFieldDefinition } from 'graphql-types-generator/generator/fieldMapper';
import { SourceFileDependencyMap, withJSDoc } from 'graphql-types-generator/generator/utilities';
import { join, relative } from 'path';
import * as ts from 'typescript';
import {
    ResolversMap,
    DeclaringType,
    trackResolvers,
    generateResolverTypes,
} from 'graphql-types-generator/generator/resolverType';

export interface ResolversDirective {
    importPath: string;
    typeName: string;
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
                    typeName: defNode.name.value,
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

export function generateObjectTypeDefinitions(context: GeneratorContext): Promise<void> {
    return Promise.all(
        Array.from(context.getTypeDefinitionMap().entries()).map(entry => {
            const [sourcePath, defNodes] = entry;
            const relativePath = relative(context.schemaInputPath.toString(), sourcePath);
            const resultFilePath = join(context.typesOutputPath.toString(), relativePath) + '.ts';
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

                const utilPath = join(context.typesImportPrefix, 'index');

                const resolversMap: ResolversMap = new Map();
                resolversMap.set(typeName as DeclaringType, []);

                if (fieldResolvers.length > 0) {
                    const importNames = dependencyMap.get(utilPath) || new Set();
                    importNames.add('Resolver');
                    dependencyMap.set(utilPath, importNames);

                    fieldResolvers.forEach(field => {
                        trackResolvers(context, field, typeName, tsNodes, dependencyMap, resolversMap);
                    });
                }

                generateResolverTypes(tsNodes, resolversMap);
            });

            tsNodes.push(ts.createNode(ts.SyntaxKind.EndOfFileToken));

            // remove dependencies within same files from the external dependency map.
            dependencyMap.delete(join(context.typesImportPrefix, relativePath));

            return printSourceContent(context, resultFilePath, {
                dependencies: dependencyMap,
                nodes: tsNodes,
            });
        }),
    ).then(_ => void 0);
}
