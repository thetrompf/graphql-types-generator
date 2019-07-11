import {
    GraphQLTypesGeneratorPlugin,
    GraphQLTypesPluginKind,
    GraphQLTypesGeneratorPluginConfig,
} from 'graphql-types-generator/plugin';
import { promisify, isError } from 'util';
import { stat as statNode, PathLike, readFile as readFileNode, readdir as readdirNode } from 'fs';
import { DocumentNode, parse as parseGraphQL, Source, concatAST, buildASTSchema } from 'graphql';
import { join, resolve } from 'path';
import { GeneratorContext } from 'graphql-types-generator/GeneratorContext';

const stat = promisify(statNode);
const readFile = promisify(readFileNode);
const readdir = promisify(readdirNode);

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

function isNodeException(err: any): err is NodeJS.ErrnoException {
    return (
        isError(err) &&
        (typeof (err as NodeJS.ErrnoException).code === 'string' ||
            typeof (err as NodeJS.ErrnoException).errno === 'number')
    );
}

interface SchemaPluginConfig extends GraphQLTypesGeneratorPluginConfig {
    inputPath: string;
}

function formatError(prefix: string, msg: string): string {
    return `${prefix} ${msg}`;
}

function formatPluginError(msg: string): string {
    return formatError('[graphql-types-generator/plugins/schema]', msg);
}

type Writable<T> = { -readonly [P in keyof T]: T[P] };

export const plugin: GraphQLTypesGeneratorPlugin<SchemaPluginConfig> = {
    configure: (_, config): void => {
        if (
            typeof config !== 'object' ||
            config == null ||
            typeof (config as Partial<SchemaPluginConfig>).inputPath !== 'string'
        ) {
            throw new Error('');
        }
    },
    filesystem: {
        initial: async (context, config) => {
            const inputPath = resolve(process.cwd(), config.inputPath);
            try {
                const stats = await stat(inputPath);
                if (stats.isDirectory() || stats.isFile()) {
                    const document = await (stats.isDirectory()
                        ? concatAST(await findSchemasFromDirectory(inputPath))
                        : parse(inputPath));

                    const schema = buildASTSchema(document, {
                        assumeValidSDL: true,
                    });

                    (context as Writable<GeneratorContext>).schema = schema;
                    (context as Writable<GeneratorContext>).document = document;
                } else {
                    throw Error(
                        formatPluginError(`inputPath must be either:
- a relative path to a single GraphQL schema file.
- an absolute path to a single GraphQL schema file.
- a relative path to a directory containing one or more GraphQL schema files to be merged.
- an absolute path to a directory containing one or more GraphQL schema files to be merged.`),
                    );
                }
            } catch (e) {
                if (isNodeException(e) && e.code === 'ENOENT') {
                    throw Error(
                        formatPluginError(`inputPath not found, it must be either:
- a relative path to a single GraphQL schema file.
- an absolute path to a single GraphQL schema file.
- a relative path to a directory containing one or more GraphQL schema files to be merged.
- an absolute path to a directory containing one or more GraphQL schema files to be merged.`),
                    );
                } else {
                    throw e;
                }
            }
        },
    },
    kind: GraphQLTypesPluginKind.TypeScript,
};
