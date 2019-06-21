import {
    FieldDefinitionNode,
    GraphQLError,
    InterfaceTypeDefinitionNode,
    ObjectTypeDefinitionNode,
    ObjectTypeExtensionNode,
    printError,
    StringValueNode,
} from 'graphql';
import { SourceFileContent } from 'graphql-types-generator/generator/printSoruceFile';
import * as ts from 'typescript';
import { GeneratorContext } from './GeneratorContext';

type DefinitionNode =
    | ObjectTypeDefinitionNode
    | ObjectTypeExtensionNode
    | FieldDefinitionNode
    | InterfaceTypeDefinitionNode;

export function printLocation(defNode: DefinitionNode) {
    const location = defNode.loc;
    if (location == null) {
        return;
    }
    // const loc = getLocation(location.source, location.start);
    // console.log(location.source.name + ' [' + loc.line + ', ' + loc.column + ']');
    console.log(printError(new GraphQLError('Test', defNode, location.source)));
}

export function filterNonNull<T>(arr: (T | null | undefined)[]): T[] {
    return arr.filter(e => e != null) as T[];
}

function addComment<TNode extends ts.Node>(node: TNode, comment: string, hasTrailingNewLine = true): TNode {
    const lines = comment.split('\n');
    lines.map((line, idx) =>
        ts.addSyntheticLeadingComment(
            node,
            ts.SyntaxKind.SingleLineCommentTrivia,
            ` ${line}${hasTrailingNewLine && idx + 1 === lines.length ? '\n\n' : ''}`,
            true,
        ),
    );
    return node;
}

function addJSDoc<TNode extends ts.Node>(node: TNode, comment: string): TNode {
    return ts.addSyntheticLeadingComment(
        node,
        ts.SyntaxKind.MultiLineCommentTrivia,
        `*\n * ${comment.split('\n').join('\n * ')}\n `,
        true,
    );
}

export function withJSDoc<TNode extends ts.Node>(
    node: TNode,
    comment: StringValueNode | string | null | undefined,
): TNode {
    return comment == null ? node : addJSDoc(node, typeof comment === 'object' ? comment.value : comment);
}

export function withComment<TNode extends ts.Node>(
    node: TNode,
    comment: string | null | undefined,
    hasTrailingNewLine = true,
): TNode {
    return comment == null ? node : addComment(node, comment, hasTrailingNewLine);
}

export type SourceFileDependencyMap = Map<string, Set<string>>;

`/**
 * Resolver utility type for constructing
 * a GraphQL resolver methods \`interface\`.
 */
export type Resolver<TParent, TArgs, TResult> = (parent: TParent, args: TArgs, info: GraphQLResolveInfo) => TResult;
`;
export const generateResolverType = (context: GeneratorContext): SourceFileContent => ({
    dependencies: new Map([
        ['graphql', new Set(['GraphQLResolveInfo'])],
        context.context == null
            ? ['as', new Set()]
            : [context.context.importPath, new Set([context.context.importName])],
    ]),
    nodes: addJSDoc(
        ts.createTypeAliasDeclaration(
            undefined,
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            ts.createIdentifier('Resolver'),
            [
                ts.createTypeParameterDeclaration(ts.createIdentifier('TParent'), undefined, undefined),
                ts.createTypeParameterDeclaration(ts.createIdentifier('TArgs'), undefined, undefined),
                ts.createTypeParameterDeclaration(ts.createIdentifier('TResult'), undefined, undefined),
            ],
            ts.createFunctionTypeNode(
                undefined,
                [
                    ts.createParameter(
                        undefined,
                        undefined,
                        undefined,
                        ts.createIdentifier('context'),
                        undefined,
                        ts.createTypeReferenceNode(ts.createIdentifier('Context'), undefined),
                        undefined,
                    ),
                    ts.createParameter(
                        undefined,
                        undefined,
                        undefined,
                        ts.createIdentifier('parent'),
                        undefined,
                        ts.createTypeReferenceNode(ts.createIdentifier('TParent'), undefined),
                        undefined,
                    ),
                    ts.createParameter(
                        undefined,
                        undefined,
                        undefined,
                        ts.createIdentifier('args'),
                        undefined,
                        ts.createTypeReferenceNode(ts.createIdentifier('TArgs'), undefined),
                        undefined,
                    ),
                    ts.createParameter(
                        undefined,
                        undefined,
                        undefined,
                        ts.createIdentifier('info'),
                        undefined,
                        ts.createTypeReferenceNode(ts.createIdentifier('GraphQLResolveInfo'), undefined),
                        undefined,
                    ),
                ],
                ts.createTypeReferenceNode(ts.createIdentifier('TResult'), undefined),
            ),
        ),
        `Resolver utility type for constructing
a GraphQL resolver methods \`interface\`.`,
    ),
});
