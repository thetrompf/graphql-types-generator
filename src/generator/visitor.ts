import { visit, visitWithTypeInfo, TypeInfo, ASTNode } from 'graphql';
import {
    collectTypeDefinitions,
    collectTypeExtensions,
    collectInputObjectTypeDefinitions,
} from 'graphql-types-generator/generator/objectTypes';
import { collectInterfaceDefinitions } from 'graphql-types-generator/generator/interfaceTypes';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { collectOperationType } from 'graphql-types-generator/generator/collectOperationType';

export function visitor(context: GeneratorContext): void {
    const document = context.document;
    const schema = context.schema;
    const typeInfo = new TypeInfo(schema);
    document.definitions.forEach(def => visitNode(context, typeInfo, def));
}

function visitNode(context: GeneratorContext, typeInfo: TypeInfo, astNode: ASTNode) {
    visit(
        astNode,
        visitWithTypeInfo(typeInfo, {
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
    );
}
