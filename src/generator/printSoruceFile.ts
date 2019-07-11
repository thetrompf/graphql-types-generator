import * as ts from 'typescript';
import { PathLike, writeFile as writeFileNode } from 'fs';
import { promisify } from 'util';
import { GeneratorContext } from 'graphql-types-generator/GeneratorContext';
import { withComment, SourceFileDependencyMap } from 'graphql-types-generator/utilities';
import { Options as PrettierOptions } from 'prettier';

type Prettier = typeof import('prettier');

const prettierPromise = import('prettier').catch(_err => {
    console.warn('Prettier not found');
    return null;
});

let prettierWithConfig: Maybe<[Prettier, Prettier]> | 'NOT-THERE' = null;
async function getPrettier(): Promise<Maybe<[Prettier, Maybe<PrettierOptions>]>> {
    if (prettierWithConfig == 'NOT-THERE') {
        return null;
    }
    const prettier = await prettierPromise;
    if (prettier == null) {
        prettierWithConfig = 'NOT-THERE';
        return null;
    }

    const config = await prettier.resolveConfig(process.cwd());
    return [prettier, config];
}

async function formatCode(source: string): Promise<string> {
    const prettierObject = await getPrettier();
    if (prettierObject == null) {
        return source;
    }
    const [prettier, options] = prettierObject;
    return prettier.format(source, options || undefined);
}

export const writeFile = promisify(writeFileNode);

const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
});

export interface SourceFileContent {
    nodes: ts.Node | ts.Node[];
    dependencies?: SourceFileDependencyMap | null;
}

export async function printSourceContent(
    context: GeneratorContext,
    outputPath: PathLike,
    content: SourceFileContent,
): Promise<void> {
    const sourceFile = ts.createSourceFile(
        outputPath.toString(),
        '',
        context.targetLanguageVersion,
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

    const generatedSource = await formatCode(
        printer.printList(ts.ListFormat.MultiLine, ts.createNodeArray(tsNodes, true), sourceFile),
    );

    return writeFile(outputPath, generatedSource, {
        flag: 'w+',
        mode: 0o644,
        encoding: 'utf8',
    });
}

export async function printSourceFile(sourceFile: ts.SourceFile): Promise<void> {
    const generatedSource = await formatCode(printer.printFile(sourceFile));
    return writeFile(sourceFile.fileName, generatedSource, {
        flag: 'w+',
        mode: 0o644,
        encoding: 'utf8',
    });
}
