import { exists as existsNode, mkdir as mkdirNode } from 'fs';
import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from 'graphql-types-generator/plugin';
import * as ts from 'typescript';
import { promisify } from 'util';

const mkdir = promisify(mkdirNode);
const exist = promisify(existsNode);

interface DataloaderPluginConfig {
    importPrefix: string;
    outputPath: string;
}

export const plugin: GraphQLTypesGeneratorPlugin<DataloaderPluginConfig> = {
    configure(_, config): void {
        if (
            typeof config !== 'object' ||
            config == null ||
            typeof (config as Partial<DataloaderPluginConfig>).importPrefix !== 'string' ||
            typeof (config as Partial<DataloaderPluginConfig>).outputPath !== 'string'
        ) {
            throw new Error('');
        }
    },
    filesystem: {
        async initial(_context, config): Promise<void> {
            if (!(await exist(config.outputPath))) {
                await mkdir(config.outputPath);
            }
        },
    },
    kind: GraphQLTypesPluginKind.TypeScript,
    typescript: {
        transform() {
            return (context: ts.TransformationContext) => {
                return (root: ts.Node): ts.Node => {
                    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
                        return ts.visitEachChild(node, visit, context);
                    };
                    return ts.visitNode(root, visit);
                };
            };
        },
    },
};
