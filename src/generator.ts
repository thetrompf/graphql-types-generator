import { PathLike, readFile as readFileNode, readdir as readdirNode, stat as statNode, exists as existsNode, mkdir as mkdirNode } from 'fs';
import { concatAST, buildASTSchema, DocumentNode, Source, parse as parseGraphQL, printSchema } from 'graphql';
import { promisify } from 'util';
import { join } from 'path';
import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { visitor } from 'graphql-types-generator/generator/visitor';
import { printSourceFile, writeFile } from 'graphql-types-generator/generator/printSoruceFile';
import { generateResolverType } from 'graphql-types-generator/generator/resolver';
import { generateObjectTypeDefinitions } from 'graphql-types-generator/generator/objectTypes';
import { updateResolvers } from 'graphql-types-generator/generator/resolverType';

const readFile = promisify(readFileNode);
const readdir = promisify(readdirNode);
const stat = promisify(statNode);
const exists = promisify(existsNode);
const mkdir = promisify(mkdirNode);

export interface GeneratorOptions {
    inputPath: PathLike,
    outputPath: PathLike,
    importPrefix?: string,
    contextImport?: string,
}

export async function generate(opts: GeneratorOptions): Promise<void> {
    if (!await exists(opts.outputPath)) {
        await mkdir(opts.outputPath, {
            recursive: true,
        });
    }

    const stats = await stat(opts.inputPath);
    const document = await (stats.isDirectory()
        ? concatAST(await findSchemasFromDirectory(opts.inputPath))
        : parse(opts.inputPath));

    const schema = buildASTSchema(document, {
        assumeValidSDL: true,
    });

    const contextImportParts = opts.contextImport == null ? null : opts.contextImport.split('#');
    const contextImport: Maybe<{ importPath: string, importName: string }> = contextImportParts == null ? null : {
        importName: contextImportParts[1] || 'default',
        importPath: contextImportParts[0],
    };

    const context = new GeneratorContext({
        importPrefix: opts.importPrefix || './',
        inputPath: opts.inputPath,
        outputPath: opts.outputPath,
        document: document,
        schema: schema,
        context: contextImport,
    });

    visitor(context);

    context.validate();
    if (context.hasErrors) {
        throw context;
    }

    await printSourceFile(context, join(context.outputPath.toString(), 'index.ts'), generateResolverType(context));
    await generateObjectTypeDefinitions(context);

    if (context.hasErrors) {
        throw context;
    }

    await updateResolvers(context);

    await writeFile(join(context.outputPath.toString(), 'schema.graphql'), printSchema(schema), {
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
