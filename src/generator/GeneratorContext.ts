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

const AUTO_GEN_HEADER = `THIS FILE IS AUTO-GENERATED.
ANY MODIFICATION WILL BE DISCARDED UPON NEXT COMPILATION.`;

export class GeneratorContext {
    public readonly AUTO_GEN_HEADER: string;

    public readonly importPrefix: string;
    public readonly inputPath: PathLike;
    public readonly outputPath: PathLike;
    public readonly schema: GraphQLSchema;
    public readonly document: DocumentNode;
    public readonly context: { importPath: string; importName: string } | null;

    public readonly fieldResolversMap: Map<string, (FieldDefinitionNode & { __gtg: { resolvers: Maybe<ResolversDirective> } })[]>;
    public readonly inputObjectTypeDefinitionsMap: Map<string, InputObjectTypeDefinitionNode[]>;
    public readonly interfaceTypeDefinitionsMap: Map<string, InterfaceTypeDefinitionNode[]>;
    public readonly objectTypeDefinitionsMap: Map<string, ObjectTypeDefinitionNode[]>;
    public readonly objectTypeExtensionsMap: Map<string, ObjectTypeExtensionNode[]>;
    public readonly objectTypeFieldDefinitions: Map<string, (FieldDefinitionNode | InputValueDefinitionNode)[]>;

    public readonly errors: GraphQLError[];

    public constructor(options: {
        AUTO_GEN_HEADER?: string;
        inputPath: PathLike;
        outputPath: PathLike;
        document: DocumentNode;
        schema: GraphQLSchema;
        importPrefix: string;
        context: { importPath: string; importName: string } | null;
    }) {
        this.AUTO_GEN_HEADER = options.AUTO_GEN_HEADER || AUTO_GEN_HEADER;
        this.importPrefix = options.importPrefix;
        this.inputPath = options.inputPath;
        this.outputPath = options.outputPath;
        this.document = options.document;
        this.schema = options.schema;
        this.context = options.context;

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

    public validate() {
        this.validateObjectTypeDefinitions();
        this.validateFieldDefinitions();
    }
}
