/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as campaign from "../campaign.js";
import type * as characters from "../characters.js";
import type * as entities from "../entities.js";
import type * as files from "../files.js";
import type * as lib_tenancy from "../lib/tenancy.js";
import type * as maps from "../maps.js";
import type * as plots from "../plots.js";
import type * as portal from "../portal.js";
import type * as relationships from "../relationships.js";
import type * as session from "../session.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  calendar: typeof calendar;
  campaign: typeof campaign;
  characters: typeof characters;
  entities: typeof entities;
  files: typeof files;
  "lib/tenancy": typeof lib_tenancy;
  maps: typeof maps;
  plots: typeof plots;
  portal: typeof portal;
  relationships: typeof relationships;
  session: typeof session;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
