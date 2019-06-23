import * as ts from 'typescript';
import { GeneratorContext, DecoratedFieldDefinitionNode } from 'graphql-types-generator/generator/GeneratorContext';
import { SourceFileDependencyMap } from 'graphql-types-generator/generator/utilities';
import {
    FieldDefinitionNode,
    GraphQLError,
    InputValueDefinitionNode,
    ListTypeNode,
    NameNode,
    NamedTypeNode,
    TypeNode,
    ObjectTypeDefinitionNode,
    InterfaceTypeDefinitionNode,
    InputObjectTypeDefinitionNode,
} from 'graphql';
import { relative, join } from 'path';
import { ResolversDirective } from 'graphql-types-generator/generator/objectTypes';

export function fieldNamedTypeMapper(
    context: GeneratorContext,
    nameNode: NameNode,
    dependencyMap: SourceFileDependencyMap,
): ts.TypeNode {
    switch (nameNode.value) {
        case 'Boolean':
            return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
        case 'ID':
            return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        case 'String':
            return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        case 'Float':
            return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'Int':
            return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        default:
            const objectTypeDefinitions = context.objectTypeDefinitionsMap.get(nameNode.value);
            const interfaceTypeDefinitions = context.interfaceTypeDefinitionsMap.get(nameNode.value);
            const inputTypeDefinitions = context.inputObjectTypeDefinitionsMap.get(nameNode.value);

            const defintions = [
                ...(inputTypeDefinitions || []),
                ...(interfaceTypeDefinitions || []),
                ...(objectTypeDefinitions || []),
            ];

            if (defintions.length > 1) {
                context.errors.push(
                    new GraphQLError(`Multiple declaration of type: ${nameNode.value} was found`, [
                        nameNode,
                        ...defintions,
                    ]),
                );
                return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
            }

            const generateFieldType = (
                defNodes: ObjectTypeDefinitionNode[] | InterfaceTypeDefinitionNode[] | InputObjectTypeDefinitionNode[],
            ): ts.TypeNode => {
                const defNode = defNodes[0];
                const importPath = join(
                    context.typesImportPrefix,
                    relative(context.schemaInputPath.toString(), defNode.loc!.source.name),
                );
                const importNames = dependencyMap.get(importPath);
                if (importNames == null) {
                    dependencyMap.set(importPath, new Set([defNode.name.value]));
                } else {
                    importNames.add(defNode.name.value);
                }
                return ts.createTypeReferenceNode(ts.createIdentifier(defNode.name.value), undefined);
            };

            if (objectTypeDefinitions != null) {
                return generateFieldType(objectTypeDefinitions);
            } else if (interfaceTypeDefinitions != null) {
                return generateFieldType(interfaceTypeDefinitions);
            } else if (inputTypeDefinitions != null) {
                return generateFieldType(inputTypeDefinitions);
            } else {
                context.errors.push(
                    new GraphQLError(`Could not find any type declaration of: ${nameNode.value}`, nameNode),
                );
                return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
            }
    }
}

export function fieldNonNullTypeMapper(
    context: GeneratorContext,
    typeNode: NamedTypeNode | ListTypeNode,
    externalResources: SourceFileDependencyMap,
): ts.TypeNode {
    switch (typeNode.kind) {
        case 'NamedType':
            return fieldNamedTypeMapper(context, typeNode.name, externalResources);
        case 'ListType':
            return ts.createArrayTypeNode(fieldTypeMapper(context, typeNode.type, externalResources));
        default:
            context.errors.push(new GraphQLError(`Invalid NonNullable TypeNode kind: ${typeNode!.kind}`));
            return null as never;
    }
}

export function fieldTypeMapper(
    context: GeneratorContext,
    typeNode: TypeNode,
    externalResources: SourceFileDependencyMap,
): ts.TypeNode {
    switch (typeNode.kind) {
        case 'NonNullType':
            return fieldNonNullTypeMapper(context, typeNode.type, externalResources);
        case 'ListType':
            return ts.createTypeReferenceNode('Maybe', [fieldTypeMapper(context, typeNode.type, externalResources)]);
        case 'NamedType':
            return ts.createTypeReferenceNode('Maybe', [
                fieldNamedTypeMapper(context, typeNode.name, externalResources),
            ]);
        default:
            context.errors.push(new GraphQLError(`Unknown TypeNode kind: ${typeNode!.kind}`));
            return null as never;
    }
}

interface ResolveDirective {
    resolverName: string;
}
function getResolveDirective(context: GeneratorContext, defNode: FieldDefinitionNode): Maybe<ResolveDirective> {
    const directive =
        defNode.directives == null
            ? null
            : defNode.directives.find(directive => directive.name.value === 'resolve') || null;

    if (directive == null) {
        return null;
    } else if (directive.arguments == null || directive.arguments.length === 0) {
        return {
            resolverName: defNode.name.value,
        };
    } else if (directive.arguments) {
        const resolverNameArg = directive.arguments[0];
        if (resolverNameArg.name.value !== 'resolverName') {
            context.errors.push(
                new GraphQLError(
                    `Unknown argument: ${resolverNameArg.name.value}, did you mean resolveName?`,
                    resolverNameArg,
                ),
            );
        } else if (resolverNameArg.value.kind !== 'StringValue') {
            context.errors.push(
                new GraphQLError(
                    'resolverName argument must be either ommitted or a string value',
                    resolverNameArg.value,
                ),
            );
        } else {
            return {
                resolverName: resolverNameArg.value.value,
            };
        }
    }
    return null;
}

function addResolversDirective(
    defNode: FieldDefinitionNode | DecoratedFieldDefinitionNode,
    resolversDirective: Maybe<ResolversDirective>,
): defNode is DecoratedFieldDefinitionNode {
    (defNode as DecoratedFieldDefinitionNode).__gtg = {
        ...(defNode as DecoratedFieldDefinitionNode).__gtg,
        resolvers: resolversDirective,
    };
    return true;
}

export function collectFieldDefinition(
    context: GeneratorContext,
    typeName: string,
    defNode: FieldDefinitionNode | InputValueDefinitionNode,
    resolversDirective: Maybe<ResolversDirective>,
): void {
    const resolveDirective = defNode.kind === 'InputValueDefinition' ? null : getResolveDirective(context, defNode);
    if (resolveDirective == null) {
        const fieldDefinitions = context.objectTypeFieldDefinitions.get(typeName);

        fieldDefinitions == null
            ? context.objectTypeFieldDefinitions.set(typeName, [defNode])
            : fieldDefinitions.push(defNode);
    } else if (defNode.kind === 'FieldDefinition') {
        if (addResolversDirective(defNode, resolversDirective)) {
            const fieldResolvers = context.fieldResolversMap.get(typeName);
            fieldResolvers == null ? context.fieldResolversMap.set(typeName, [defNode]) : fieldResolvers.push(defNode);
        }
    }
}
