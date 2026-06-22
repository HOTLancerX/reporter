/**
 * Reporter Profile Layout 1
 *
 * Public URL pattern: /<reporter-prefix>/<user-slug>
 * (permalink prefix configured in Admin → Permalinks, key: "reporter")
 *
 * Receives from app/(root)/[...slug]/page.tsx:
 *   data         — synthetic post-like object (title = reporter name, info.userId)
 *   settings     — site settings
 *   permalinkMap — prefix map
 *   pageData     — { reporter, posts, activeBox } injected by serverHooks.ts
 *
 * Displays:
 *   - Reporter profile card (avatar, name, bio, social links)
 *   - Published reporter-post grid using the active blog-box template
 */

import Image from "next/image";
import Link from "next/link";
import ReporterPostGrid from "./ReporterPostGrid";
import { Icon } from "@iconify/react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReporterInfo {
    _id:     string;
    name:    string;
    slug:    string;
    image:   string;
    type:    string;
    bio:     string;
    website: string;
    twitter: string;
    city:    string;
    state:   string;
}

interface ReporterPost {
    _id:   string;
    title: string;
    slug:  string;
    info:  Record<string, string>;
}

interface ReporterPageData {
    reporter: ReporterInfo | null;
    posts:    ReporterPost[];
    activeBox: { label: string; pluginNx: string } | null;
}

interface ReporterLayout1Props {
    data: {
        _id:       string;
        title:     string;
        slug:      string;
        status:    string;
        createdAt: string;
        info:      Record<string, string>;
    };
    settings?:     Record<string, any>;
    permalinkMap?: Record<string, string>;
    pageData?:     ReporterPageData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUrl(prefix: string, slug: string): string {
    const p = prefix.trim().replace(/^\/+|\/+$/g, "");
    return p ? `/${p}/${slug}` : `/${slug}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReporterLayout1({
    data,
    settings = {},
    permalinkMap = {},
    pageData,
}: ReporterLayout1Props) {
    const reporter  = pageData?.reporter  ?? null;
    const posts     = pageData?.posts     ?? [];
    const activeBox = pageData?.activeBox ?? null;

    // reporter-post permalink prefix (falls back to "reporter-post")
    const postPrefix = (permalinkMap["reporter-post"] ?? "reporter-post")
        .trim()
        .replace(/^\/+|\/+$/g, "") || "reporter-post";

    const displayName = reporter?.name ?? data.title;

    return (
        <main className="min-h-screen bg-gray-50">

            {/* ── Hero banner ── */}
            <header className="bg-linear-to-r from-sky-500 to-blue-600 py-12 px-6">
                <div className="container">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-sm text-white/70 mb-6 flex-wrap">
                        <Link href="/" className="hover:text-white transition-colors">
                            Home
                        </Link>
                        <span className="text-white/40">›</span>
                        <span className="text-white font-medium">Reporter</span>
                        <span className="text-white/40">›</span>
                        <span className="text-white font-medium">{displayName}</span>
                    </nav>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* Avatar */}
                        <div className="shrink-0">
                            {reporter?.image ? (
                                <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white/30 shadow-lg">
                                    <Image
                                        src={reporter.image}
                                        alt={displayName}
                                        fill
                                        className="object-cover"
                                        sizes="96px"
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-4xl ring-4 ring-white/30">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="text-center sm:text-left space-y-2">
                            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                                    {displayName}
                                </h1>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
                                    <Icon icon="solar:document-bold" width={11} />
                                    Reporter
                                </span>
                            </div>

                            {/* Location */}
                            {(reporter?.city || reporter?.state) && (
                                <p className="flex items-center justify-center sm:justify-start gap-1.5 text-white/80 text-sm">
                                    <Icon icon="solar:map-point-bold" width={13} />
                                    {[reporter.city, reporter.state]
                                        .filter(Boolean)
                                        .join(", ")}
                                </p>
                            )}

                            {/* Bio */}
                            {reporter?.bio && (
                                <p className="text-white/80 text-sm max-w-xl">
                                    {reporter.bio}
                                </p>
                            )}

                            {/* Social links */}
                            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap pt-1">
                                {reporter?.website && (
                                    <a
                                        href={reporter.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
                                    >
                                        🌐 Website
                                    </a>
                                )}
                                {reporter?.twitter && (
                                    <a
                                        href={`https://x.com/${reporter.twitter.replace(/^@/, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors"
                                    >
                                        𝕏{" "}
                                        {reporter.twitter.startsWith("@")
                                            ? reporter.twitter
                                            : `@${reporter.twitter}`}
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Post count badge */}
                        <div className="sm:ml-auto text-center">
                            <div className="bg-white/20 rounded-2xl px-6 py-4">
                                <p className="text-3xl font-extrabold text-white">
                                    {posts.length}
                                </p>
                                <p className="text-xs text-white/70 mt-0.5">
                                    Post{posts.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Posts section ── */}
            <div className="container py-10">
                <div className="flex items-center gap-3 mb-6">
                    <Icon icon="solar:document-bold" width={20} className="text-sky-500" />
                    <h2 className="text-xl font-bold text-gray-900">
                        Posts by {displayName}
                    </h2>
                </div>

                <ReporterPostGrid
                    posts={posts}
                    activeBox={activeBox}
                    postPrefix={postPrefix}
                    reporterName={displayName}
                />
            </div>
        </main>
    );
}
