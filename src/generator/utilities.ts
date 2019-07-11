import {
    FieldDefinitionNode,
    GraphQLError,
    InterfaceTypeDefinitionNode,
    ObjectTypeDefinitionNode,
    ObjectTypeExtensionNode,
    printError,
    StringValueNode,
    Location,
} from 'graphql';
import * as ts from 'typescript';

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

export function assertSourceLocation<TNode extends { loc?: Location }>(node: TNode): TNode & { loc: Location } {
    if (node.loc == null) {
        throw new Error('No source location found for node');
    }
    return node as TNode & { loc: Location };
}

export function filterMap<T, U extends T, R>(arr: T[], filterFn: (val: T) => val is U, mapFn: (e: U) => R): R[] {
    return arr.filter(filterFn).map(mapFn);
}

export function filterTupleEntry<T1, T2, U1 extends T1>(
    filterFn: (val: T1) => val is U1,
): (tuple: [T1, T2]) => tuple is [U1, T2] {
    return (tuple): tuple is [U1, T2] => filterFn(tuple[0]);
}
