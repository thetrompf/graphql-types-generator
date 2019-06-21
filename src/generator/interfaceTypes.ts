import { InterfaceTypeDefinitionNode } from 'graphql';
import { collectFieldDefinition } from 'graphql-types-generator/generator/fieldMapper';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';

export function collectInterfaceDefinitions(context: GeneratorContext, defNode: InterfaceTypeDefinitionNode): void {
    const typeName = defNode.name.value;
    const existingType = context.interfaceTypeDefinitionsMap.get(typeName);
    if (existingType != null) {
        existingType.push(defNode);
    } else {
        context.interfaceTypeDefinitionsMap.set(typeName, [defNode]);
    }
    // const resolversDirective = getResolversDirective(context, defNode);
    if (defNode.fields != null) {
        defNode.fields.forEach(field => collectFieldDefinition(context, typeName, field, null));
    }
}
