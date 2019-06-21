import * as ts from 'typescript';
import { PathLike, writeFile as writeFileNode } from 'fs';
import { promisify } from 'util';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { withComment, SourceFileDependencyMap } from 'graphql-types-generator/generator/utilities';

export const writeFile = promisify(writeFileNode);

const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
});

export interface SourceFileContent {
    nodes: ts.Node | ts.Node[];
    dependencies?: SourceFileDependencyMap | null;
}

export function printSourceFile(
    context: GeneratorContext,
    outputPath: PathLike,
    content: SourceFileContent,
): Promise<void> {
    const sourceFile = ts.createSourceFile(
        outputPath.toString(),
        '',
        ts.ScriptTarget.ES2018,
        undefined,
        ts.ScriptKind.TS,
    );

    const dependencies: ts.Node[] = [];

    if (content.dependencies != null) {
        content.dependencies.forEach((importNames, importPath) =>
            dependencies.push(
                ts.createImportDeclaration(
                    undefined,
                    undefined,
                    ts.createImportClause(
                        undefined,
                        ts.createNamedImports(
                            Array.from(importNames).map(importName =>
                                ts.createImportSpecifier(undefined, ts.createIdentifier(importName)),
                            ),
                        ),
                    ),
                    ts.createStringLiteral(importPath),
                ),
            ),
        );
    }

    const tsNodes = [
        withComment(ts.createToken(ts.SyntaxKind.MultiLineCommentTrivia), context.AUTO_GEN_HEADER),
        ...dependencies,
        ...(Array.isArray(content.nodes) ? content.nodes : [content.nodes]),
    ];

    const generatedSource = printer.printList(ts.ListFormat.MultiLine, ts.createNodeArray(tsNodes, true), sourceFile);

    return writeFile(outputPath, generatedSource, {
        flag: 'w+',
        mode: 0o644,
        encoding: 'utf8',
    });
}
