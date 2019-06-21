import { PathLike, readFile as readFileNode, readdir as readdirNode, stat as statNode } from 'fs';
import { concatAST, buildASTSchema, DocumentNode, Source, parse as parseGraphQL, printSchema } from 'graphql';
import { promisify } from 'util';
import { join } from 'path';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { visitor } from 'graphql-types-generator/generator/visitor';
import { printSourceFile, writeFile } from 'graphql-types-generator/generator/printSoruceFile';
import { generateResolverType } from 'graphql-types-generator/generator/utilities';
import { generateObjectTypeDefinitions } from 'graphql-types-generator/generator/objectTypes';

const readFile = promisify(readFileNode);
const readdir = promisify(readdirNode);
const stat = promisify(statNode);

export async function generate(
    inputPath: PathLike,
    outputPath: PathLike,
    importPrefix = './',
    contextImport?: { importPath: string; importName: string },
): Promise<void> {
    const stats = await stat(inputPath);
    const document = await (stats.isDirectory()
        ? concatAST(await findSchemasFromDirectory(inputPath))
        : parse(inputPath));

    const schema = buildASTSchema(document, {
        assumeValidSDL: true,
    });

    const context = new GeneratorContext({
        importPrefix: importPrefix,
        inputPath: inputPath,
        outputPath: outputPath,
        document: document,
        schema: schema,
        context: contextImport || null,
    });

    visitor(context);

    context.validate();
    if (context.hasErrors) {
        throw context;
    }

    await printSourceFile(context, join(outputPath.toString(), 'index.ts'), generateResolverType(context));
    await generateObjectTypeDefinitions(context);

    if (context.hasErrors) {
        throw context;
    }

    await writeFile(join(outputPath.toString(), 'schema.graphql'), printSchema(schema), {
        flag: 'w+',
        mode: 0o644,
        encoding: 'utf8',
    });
}

async function parse(path: PathLike): Promise<DocumentNode> {
    const schemaText = await readFile(path);
    return parseGraphQL(new Source(Buffer.isBuffer(schemaText) ? schemaText.toString() : schemaText, path.toString()));
}

async function findSchemasFromDirectory(path: PathLike, result: DocumentNode[] = []): Promise<DocumentNode[]> {
    const entries = await readdir(path);
    const entriesAndStats = await Promise.all(
        entries.map(async entry =>
            stat(join(path.toString(), entry)).then(stats => ({ entry: join(path.toString(), entry), stats })),
        ),
    );
    const promises: Promise<DocumentNode | DocumentNode[]>[] = [];
    for (const e of entriesAndStats) {
        if (e.stats.isDirectory()) {
            promises.push(findSchemasFromDirectory(e.entry, result));
        } else if (e.stats.isFile() && (e.entry.endsWith('.graphql') || e.entry.endsWith('.gql'))) {
            promises.push(parse(e.entry));
        }
    }
    await Promise.all(promises).then(res =>
        res.forEach(r => (Array.isArray(r) ? r.forEach(r2 => result.push(r2)) : result.push(r))),
    );
    return result;
}
