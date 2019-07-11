import { GeneratorContext } from 'graphql-types-generator/GeneratorContext';
import { OperationTypeDefinitionNode } from 'graphql';

export function collectOperationType(context: GeneratorContext, defNode: OperationTypeDefinitionNode): void {
    switch (defNode.operation) {
        case 'mutation':
            (context as { mutationTypeName: string }).mutationTypeName = defNode.type.name.value;
            break;
        case 'query':
            (context as { queryTypeName: string }).queryTypeName = defNode.type.name.value;
            break;
        case 'subscription':
            (context as { subscriptionTypeName: string }).subscriptionTypeName = defNode.type.name.value;
            break;
    }
}
