import { ASTNode, TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import { collectOperationType } from 'graphql-types-generator/collectOperationType';
import { GeneratorContext } from 'graphql-types-generator/GeneratorContext';
import { collectInterfaceDefinitions } from 'graphql-types-generator/interfaceTypes';
import {
    collectInputObjectTypeDefinitions,
    collectTypeDefinitions,
    collectTypeExtensions,
} from 'graphql-types-generator/objectTypes';

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

export function visitor(context: GeneratorContext): void {
    const document = context.document;
    const schema = context.schema;
    const typeInfo = new TypeInfo(schema);
    document.definitions.forEach(def => visitNode(context, typeInfo, def));
}
