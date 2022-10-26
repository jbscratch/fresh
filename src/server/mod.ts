import { ServerContext } from "./context.ts";
import { serve } from "./deps.ts";
export { Status } from "./deps.ts";
import {
  AppModule,
  ErrorPageModule,
  IslandModule,
  MiddlewareModule,
  Plugin,
  RouteModule,
  StartOptions,
  UnknownPageModule,
} from "./types.ts";
export type {
  AppProps,
  ErrorHandler,
  ErrorHandlerContext,
  ErrorPageProps,
  FreshOptions,
  Handler,
  HandlerContext,
  Handlers,
  MiddlewareHandler,
  MiddlewareHandlerContext,
  PageProps,
  Plugin,
  PluginRenderResult,
  PluginRenderScripts,
  PluginRenderStyleTag,
  RenderFunction,
  RouteConfig,
  StartOptions,
  UnknownHandler,
  UnknownHandlerContext,
  UnknownPageProps,
} from "./types.ts";
export { RenderContext } from "./render.ts";
export type { InnerRenderFunction } from "./render.ts";

export interface Manifest {
  routes: Record<
    string,
    | RouteModule
    | MiddlewareModule
    | AppModule
    | ErrorPageModule
    | UnknownPageModule
  >;
  islands: Record<string, IslandModule>;
  baseUrl: string;
  config?: DenoConfig;
}

export interface DenoConfig {
  importMap: string;
  compilerOptions?: {
    jsx?: string;
    jsxImportSource?: string;
  };
}

export { ServerContext };

export async function start(routes: Manifest, opts: StartOptions = {}) {
  const ctx = await ServerContext.fromManifest(routes, opts);
  opts.port ??= 8000;

  // go through all plugins, find the ones with a setupServerContext hook & run them
  type SetupPlugin = Required<Pick<Plugin, "setupServerContext" | "name">>;
  const isSetupPlugin = (plugin: Plugin): plugin is SetupPlugin =>
    typeof plugin.setupServerContext === "function";
  const setupPlugins = opts.plugins?.filter<SetupPlugin>(isSetupPlugin);

  let newCtx = ctx;
  if (setupPlugins !== undefined && setupPlugins.length > 0) {
    for (const plugin of setupPlugins) {
      newCtx = plugin.setupServerContext(newCtx);
    }
  }

  if (!newCtx) throw new Error(`This should not happen!`);

  if (opts.experimentalDenoServe === true) {
    // @ts-ignore as `Deno.serve` is still unstable.
    await Deno.serve(newCtx.handler() as Deno.ServeHandler, opts);
  } else {
    await serve(newCtx.handler(), opts);
  }
}
