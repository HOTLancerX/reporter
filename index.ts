/**
 * plugin/reporter/index.ts — Reporter plugin.
 *
 * Reporters write blog posts — they use the existing "blog" post type.
 * No new post type or category type is registered.
 *
 * ── What this plugin adds ─────────────────────────────────────────────────────
 *   Admin nav + page  /admin/reporter          → list of reporter users
 *                                                  + per-reporter post-status default
 *
 *   Account nav + pages
 *     /account/post/blog        → ReporterPostList  (reporter's own blog posts)
 *     /account/post/blog/new    → ReporterPostForm  (add)
 *     /account/post/blog/<id>   → ReporterPostForm  (edit)
 *
 *   Public profile page
 *     /<reporter-prefix>/<user-slug>  → ReporterLayout1
 *     (set "reporter" prefix in Admin → Permalinks)
 *
 * ── Access ────────────────────────────────────────────────────────────────────
 *   Any user with type="reporter" and status="active" can post immediately.
 *   Admin grants access by setting user.type="reporter" in the Users admin.
 */

import { addHook, type PluginMeta } from "@/hook";
import ReporterPostList from "./pages/ReporterPostList";
import ReporterPostForm from "./pages/ReporterPostForm";
import ReporterList     from "./admin/ReporterList";
import ReporterLayout1  from "./layout/Layout1";

// ─── Plugin metadata ──────────────────────────────────────────────────────────
export const PLUGINS: PluginMeta = {
    nx:          "com.system.reporter",
    name:        "reporter",
    version:     "1.0.0",
    description: "Reporter portal — reporters write blog posts with admin oversight.",
    author:      "System",
    path:        "https://github.com/HOTLancerX/reporter.git",
    icon:        "solar:document-bold",
    color:       "from-sky-500 to-blue-600",
};

export function register() {

    // ─── Admin nav — Reporter user list ───────────────────────────────────────
    addHook("admin.nav", [
        {
            key:      "reporter",
            label:    "Reporter",
            icon:     "solar:users-group-rounded-bold",
            slug:     "reporter",
            parent:   "",
            position: 25,
        },
    ], PLUGINS.nx);

    // ─── Admin page — reporter user list ──────────────────────────────────────
    addHook("admin.pages", [
        {
            key:      "reporter",
            label:    "Reporters",
            type:     "reporter-admin",
            style:    "left",
            position: 50,
            path:     ReporterList,
        },
    ], PLUGINS.nx);

    // ─── Public reporter profile page template ────────────────────────────────
    // Resolved by the slug router when the URL matches the "reporter" permalink
    // prefix. serverHooks.ts fetches the reporter's published blog posts.
    addHook("root.pages", [
        {
            key:       "reporter",
            label:     "Reporter Layout 1",
            type:      "reporter",
            slug:      "dynamic",
            style:     "left",
            position:  20,
            active:    true,
            component: ReporterLayout1,
        },
    ], PLUGINS.nx);

    // ─── Account sidebar nav ──────────────────────────────────────────────────
    // slug "post/blog" → /account/post/blog  (reuses the core blog post-type URL)
    addHook("user.nav", [
        {
            key:          "reporter-posts",
            label:        "My Posts",
            icon:         "solar:document-bold",
            slug:         "post/blog",
            parent:       "",
            position:     5,
            reporterOnly: true,
        },
    ], PLUGINS.nx);

    // ─── Account pages ────────────────────────────────────────────────────────
    // /account/post/blog        → ReporterPostList
    // /account/post/blog/new    → ReporterPostForm (add)
    // /account/post/blog/<id>   → ReporterPostForm (edit)
    addHook("user.page", [
        {
            key:      "post/blog",
            label:    "My Posts",
            type:     "reporter-posts",
            style:    "left",
            position: 5,
            path:     ReporterPostList,
        },
        {
            key:      "post/blog/",
            label:    "Blog Post Form",
            type:     "reporter-posts",
            style:    "left",
            position: 6,
            path:     ReporterPostForm,
        },
    ], PLUGINS.nx);
}
