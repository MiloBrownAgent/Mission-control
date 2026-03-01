/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actionItems from "../actionItems.js";
import type * as activityLog from "../activityLog.js";
import type * as btcSignals from "../btcSignals.js";
import type * as classBookings from "../classBookings.js";
import type * as cleaningTasks from "../cleaningTasks.js";
import type * as clientLinks from "../clientLinks.js";
import type * as clients from "../clients.js";
import type * as contacts from "../contacts.js";
import type * as content from "../content.js";
import type * as crmContacts from "../crmContacts.js";
import type * as daycareReports from "../daycareReports.js";
import type * as dropboxConfig from "../dropboxConfig.js";
import type * as events from "../events.js";
import type * as flightDeals from "../flightDeals.js";
import type * as groceryItems from "../groceryItems.js";
import type * as meals from "../meals.js";
import type * as memories from "../memories.js";
import type * as outreach from "../outreach.js";
import type * as pipeline from "../pipeline.js";
import type * as polymarket from "../polymarket.js";
import type * as seed from "../seed.js";
import type * as seedCrm from "../seedCrm.js";
import type * as tasks from "../tasks.js";
import type * as weekendActivities from "../weekendActivities.js";
import type * as whoop from "../whoop.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actionItems: typeof actionItems;
  activityLog: typeof activityLog;
  btcSignals: typeof btcSignals;
  classBookings: typeof classBookings;
  cleaningTasks: typeof cleaningTasks;
  clientLinks: typeof clientLinks;
  clients: typeof clients;
  contacts: typeof contacts;
  content: typeof content;
  crmContacts: typeof crmContacts;
  daycareReports: typeof daycareReports;
  dropboxConfig: typeof dropboxConfig;
  events: typeof events;
  flightDeals: typeof flightDeals;
  groceryItems: typeof groceryItems;
  meals: typeof meals;
  memories: typeof memories;
  outreach: typeof outreach;
  pipeline: typeof pipeline;
  polymarket: typeof polymarket;
  seed: typeof seed;
  seedCrm: typeof seedCrm;
  tasks: typeof tasks;
  weekendActivities: typeof weekendActivities;
  whoop: typeof whoop;
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
