import * as ts from 'typescript';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { SourceFileDependencyMap } from 'graphql-types-generator/generator/utilities';
import {
    FieldDefinitionNode,
    GraphQLError,
    InputValueDefinitionNode,
    ListTypeNode,
    NameNode,
    NamedTypeNode,
    TypeNode,
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
            } else if (objectTypeDefinitions != null) {
                const defNode = objectTypeDefinitions[0];
                const importPath = join(
                    context.importPrefix,
                    relative(context.inputPath.toString(), defNode.loc!.source.name),
                );
                const importNames = dependencyMap.get(importPath);
                if (importNames == null) {
                    dependencyMap.set(importPath, new Set([defNode.name.value]));
                } else {
                    importNames.add(defNode.name.value);
                }
                return ts.createTypeReferenceNode(ts.createIdentifier(defNode.name.value), undefined);
            } else if (interfaceTypeDefinitions != null) {
                const defNode = interfaceTypeDefinitions[0];
                const importPath = join(
                    context.importPrefix,
                    relative(context.inputPath.toString(), defNode.loc!.source.name),
                );
                const importNames = dependencyMap.get(importPath);
                if (importNames == null) {
                    dependencyMap.set(importPath, new Set([defNode.name.value]));
                } else {
                    importNames.add(defNode.name.value);
                }
                return ts.createTypeReferenceNode(ts.createIdentifier(defNode.name.value), undefined);
            } else if (inputTypeDefinitions != null) {
                const defNode = inputTypeDefinitions[0];
                const importPath = join(
                    context.importPrefix,
                    relative(context.inputPath.toString(), defNode.loc!.source.name),
                );
                const importNames = dependencyMap.get(importPath);
                if (importNames == null) {
                    dependencyMap.set(importPath, new Set([defNode.name.value]));
                } else {
                    importNames.add(defNode.name.value);
                }
                return ts.createTypeReferenceNode(ts.createIdentifier(defNode.name.value), undefined);
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

export function collectFieldDefinition(
    context: GeneratorContext,
    typeName: string,
    defNode: FieldDefinitionNode | InputValueDefinitionNode,
    _resolversDirective: Maybe<ResolversDirective>,
): void {
    const resolveDirective = defNode.kind === 'InputValueDefinition' ? null : getResolveDirective(context, defNode);
    if (resolveDirective == null) {
        const fieldDefinitions = context.objectTypeFieldDefinitions.get(typeName);

        fieldDefinitions == null
            ? context.objectTypeFieldDefinitions.set(typeName, [defNode])
            : fieldDefinitions.push(defNode);
    } else if (defNode.kind === 'FieldDefinition') {
        const fieldResolvers = context.fieldResolversMap.get(typeName);
        fieldResolvers == null ? context.fieldResolversMap.set(typeName, [defNode]) : fieldResolvers.push(defNode);
    }
}
