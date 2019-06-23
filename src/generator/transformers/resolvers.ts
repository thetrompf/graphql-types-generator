import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import * as ts from 'typescript';

export function transformResolvers(_gContext: GeneratorContext) {
    return (context: ts.TransformationContext) => {
        let resolversVariableFound = false;
        context.enableSubstitution(ts.SyntaxKind.Identifier);
        return (rootNode: ts.Node): ts.Node => {
            const visit = (node: ts.Node): ts.Node => {
                if (
                    node.parent == null &&
                    ts.isVariableDeclaration(node) &&
                    ts.isIdentifier(node.name) &&
                    node.name.text === 'resolvers'
                ) {
                    resolversVariableFound = true;
                    return visitResolvers(node);
                }
                return ts.visitEachChild(node, visit, context);
            };
            const result = ts.visitNode(rootNode, visit);
            if (!resolversVariableFound) {
                // result.
                const resolvers = ts.createVariableStatement(
                    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
                    ts.createVariableDeclarationList(
                        [
                            ts.createVariableDeclaration(
                                ts.createIdentifier('resolvers'),
                                ts.createTypeReferenceNode(ts.createIdentifier('Resolvers'), undefined),
                                undefined,
                            ),
                        ],
                        ts.NodeFlags.Const,
                    ),
                );

                return ts.updateSourceFileNode(rootNode as ts.SourceFile, [
                    ...(rootNode as ts.SourceFile).statements,
                    resolvers,
                ]);
            }
            return result;
        };

        function visitResolvers(node: ts.VariableDeclaration) {
            if (
                node.type == null ||
                !ts.isTypeReferenceNode(node.type) ||
                !ts.isIdentifier(node.type.typeName) ||
                node.type.typeName.text !== 'NewResolvers2'
            ) {
                return ts.updateVariableDeclaration(
                    node,
                    node.name,
                    ts.createTypeReferenceNode(ts.createIdentifier('NewResolvers2'), undefined),
                    undefined,
                );
            }
            return node;
        }

        // function visitResolversType(node: ts.TypeNode | undefined) {
        //     return node;
        // }
    };
}
