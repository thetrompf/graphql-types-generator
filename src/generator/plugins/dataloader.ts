import { GeneratorContext } from 'graphql-types-generator/generator/GeneratorContext';
import { GraphQLTypesGeneratorPlugin, GraphQLTypesPluginKind } from 'graphql-types-generator/generator/plugin';
import * as ts from 'typescript';
import { exists as existsNode, mkdir as mkdirNode } from 'fs';
import { promisify } from 'util';

const mkdir = promisify(mkdirNode);
const exist = promisify(existsNode)

interface DataloaderPluginConfig {
    importPrefix: string;
    outputPath: string;
}

export const plugin: GraphQLTypesGeneratorPlugin<DataloaderPluginConfig> = {
    config: null as any,
    configure: (_, config): void => {
        if (
            typeof config !== 'object' ||
            config == null ||
            typeof (config as Partial<DataloaderPluginConfig>).importPrefix !== 'string' ||
            typeof (config as Partial<DataloaderPluginConfig>).outputPath !== 'string'
        ) {
            throw new Error('');
        }
    },
    filesytem: {
        initial: async (_genContext: GeneratorContext) => {
            if (!await exist(plugin.config.outputPath)) {
                return mkdir(plugin.config.outputPath);
            }
        },
    },
    kind: GraphQLTypesPluginKind.TypeScript,
    typescript: {
        transform(_genContext: GeneratorContext) {
            return (context: ts.TransformationContext) => {
                return (root: ts.Node): ts.Node => {
                    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
                        return ts.visitEachChild(node, visit, context);
                    }
                    return ts.visitNode(root, visit);
                }
            }
        }
    }
};
