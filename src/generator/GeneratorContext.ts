import {
    DocumentNode,
    FieldDefinitionNode,
    GraphQLError,
    GraphQLSchema,
    InputObjectTypeDefinitionNode,
    InputValueDefinitionNode,
    InterfaceTypeDefinitionNode,
    ObjectTypeDefinitionNode,
    ObjectTypeExtensionNode,
} from 'graphql';
import { PathLike } from 'fs';
import { ResolversDirective } from './objectTypes';
import { basename } from 'path';
import { DeclaringType, ResolverIdentifier } from './resolverType';
import * as ts from 'typescript';

const AUTO_GEN_HEADER = `THIS FILE IS AUTO-GENERATED.
ANY MODIFICATION WILL BE DISCARDED UPON NEXT COMPILATION.`;

export type OperationType = 'query' | 'mutation' | 'subscription';

interface DecoratedDefinitionNodeMetadata {
    resolvers: Maybe<ResolversDirective>;
    operationType: OperationType;
    parentTypeName: string;
}
interface DecoratedDefinitionNode {
    __gtg: DecoratedDefinitionNodeMetadata;
}
export type DecoratedFieldDefinitionNode = FieldDefinitionNode & DecoratedDefinitionNode;

export class GeneratorContext {
    public readonly AUTO_GEN_HEADER: string;

    public readonly context: { importPath: string; importName: string } | null;
    public readonly document: DocumentNode;
    public readonly resolversOutputPath: PathLike;
    public readonly resolversImportPrefix: string;
    public readonly schema: GraphQLSchema;
    public readonly schemaInputPath: PathLike;
    public readonly typesImportPrefix: string;
    public readonly typesOutputPath: PathLike;

    public readonly targetLanguageVersion: ts.ScriptTarget;

    public readonly fieldResolversMap: Map<string, DecoratedFieldDefinitionNode[]>;
    public readonly inputObjectTypeDefinitionsMap: Map<string, InputObjectTypeDefinitionNode[]>;
    public readonly interfaceTypeDefinitionsMap: Map<string, InterfaceTypeDefinitionNode[]>;
    public readonly objectTypeDefinitionsMap: Map<string, ObjectTypeDefinitionNode[]>;
    public readonly objectTypeExtensionsMap: Map<string, ObjectTypeExtensionNode[]>;
    public readonly objectTypeFieldDefinitions: Map<string, (FieldDefinitionNode | InputValueDefinitionNode)[]>;

    public readonly mutationTypeName: Maybe<string> = null;
    public readonly queryTypeName: Maybe<string> = null;
    public readonly subscriptionTypeName: Maybe<string> = null;

    public readonly errors: GraphQLError[];

    public constructor(opts: {
        AUTO_GEN_HEADER?: string;
        context: { importPath: string; importName: string } | null;
        document: DocumentNode;
        resolversImportPrefx: string;
        resolversOutputPath: PathLike;
        schema: GraphQLSchema;
        schemaInputPath: PathLike;
        targetLanguageVersion?: ts.ScriptTarget;
        typesImportPrefix: string;
        typesOutputPath: PathLike;
    }) {
        this.AUTO_GEN_HEADER = opts.AUTO_GEN_HEADER || AUTO_GEN_HEADER;
        this.context = opts.context;
        this.document = opts.document;
        this.schema = opts.schema;
        this.schemaInputPath = opts.schemaInputPath;
        this.resolversImportPrefix = opts.resolversImportPrefx;
        this.resolversOutputPath = opts.resolversOutputPath;
        this.targetLanguageVersion = opts.targetLanguageVersion || ts.ScriptTarget.ES2018;
        this.typesImportPrefix = opts.typesImportPrefix;
        this.typesOutputPath = opts.typesOutputPath;

        this.fieldResolversMap = new Map();
        this.inputObjectTypeDefinitionsMap = new Map();
        this.interfaceTypeDefinitionsMap = new Map();
        this.objectTypeDefinitionsMap = new Map();
        this.objectTypeFieldDefinitions = new Map();
        this.objectTypeExtensionsMap = new Map();
        this.errors = [];
    }

    public get hasErrors() {
        return this.errors.length > 0;
    }

    public getTypeDefinitionMap(): Map<
        string,
        Set<InputObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode>
    > {
        const result = new Map<
            string,
            Set<InputObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode>
        >();
        [this.inputObjectTypeDefinitionsMap, this.interfaceTypeDefinitionsMap, this.objectTypeDefinitionsMap].forEach(
            defMap =>
                defMap.forEach(
                    (
                        defNodes:
                            | InputObjectTypeDefinitionNode[]
                            | InterfaceTypeDefinitionNode[]
                            | ObjectTypeDefinitionNode[],
                    ) =>
                        defNodes.forEach(
                            (
                                defNode:
                                    | InputObjectTypeDefinitionNode
                                    | InterfaceTypeDefinitionNode
                                    | ObjectTypeDefinitionNode,
                            ) => {
                                const sourcePath = defNode.loc!.source.name;
                                const nodes = result.get(sourcePath) || new Set();
                                nodes.add(defNode);
                                result.set(sourcePath, nodes);
                            },
                        ),
                ),
        );
        return result;
    }

    private validateFieldDefinitions() {
        this.fieldResolversMap.forEach((defNodes, typeName) => {
            const fieldMap = new Map<string, Set<FieldDefinitionNode | InputValueDefinitionNode>>();

            const fieldDefNodes = this.objectTypeFieldDefinitions.get(typeName);
            [defNodes, fieldDefNodes].forEach(
                nodes =>
                    nodes &&
                    nodes.forEach(defNode => {
                        const fieldNodes = fieldMap.get(defNode.name.value);
                        if (fieldNodes == null) {
                            fieldMap.set(defNode.name.value, new Set([defNode]));
                        } else {
                            fieldNodes.add(defNode);
                        }
                    }),
            );

            fieldMap.forEach((nodes, fieldName) => {
                if (nodes.size > 1) {
                    this.errors.push(
                        new GraphQLError(
                            `Fields on Object types must only be declared once,
multiple declarations of field ${fieldName} on type ${typeName} was found.
`,
                            Array.from(nodes),
                        ),
                    );
                }
            });
        });
    }

    private validateObjectTypeDefinitions() {
        this.objectTypeDefinitionsMap.forEach((defNodes, typeName) => {
            if (defNodes.length > 1) {
                this.errors.push(
                    new GraphQLError(
                        `Types must only be declared once,
multiple declarations of type ${typeName} was found.
If you need to extend existing types use the following syntax instead:

extend type ${typeName} {
    ...
}`,
                        defNodes.map(defNode => defNode.name),
                    ),
                );
            }
        });
    }

    public getDeclaringSource(field: DecoratedFieldDefinitionNode) {
        return basename(field.loc!.source.name, '.graphql');
    }

    public getDeclaringTypeName(field: DecoratedFieldDefinitionNode) {
        const declaringType = this.getDeclaringSource(field);
        const parentTypeName = field.__gtg.parentTypeName;
        return (declaringType === parentTypeName ? parentTypeName : declaringType + parentTypeName) as DeclaringType;
    }

    public getResolverTypeIdentifier(field: DecoratedFieldDefinitionNode): ResolverIdentifier {
        const parentTypeName = field.__gtg.parentTypeName;

        const fieldName = field.name.value;
        const fieldTypeName = fieldName[0].toUpperCase() + fieldName.slice(1);
        const declaringTypeName = this.getDeclaringTypeName(field);

        if (parentTypeName === this.mutationTypeName) {
            return `${fieldTypeName}Mutation` as ResolverIdentifier;
        } else if (parentTypeName === this.subscriptionTypeName) {
            return `${fieldTypeName}Subscription` as ResolverIdentifier;
        } else {
            return `${declaringTypeName}${fieldTypeName}Resolver` as ResolverIdentifier;
        }
    }

    public validate() {
        this.validateObjectTypeDefinitions();
        this.validateFieldDefinitions();
    }
}
