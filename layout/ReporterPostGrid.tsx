"use client";

/**
 * ReporterPostGrid — client component that resolves the active blog-box
 * component from the hook registry and renders the reporter's post grid.
 *
 * Mirrors SellerProductGrid exactly — just scoped to reporter posts.
 * Uses blog-box templates since reporter-post is blog-like content.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHooks } from "@/hook";
import { useActivePlugins } from "@/hook/useActivePlugins";

interface ReporterPost {
    _id:   string;
    title: string;
    slug:  string;
    info:  Record<string, string>;
}

interface Props {
    posts:        ReporterPost[];
    activeBox:    { label: string; pluginNx: string } | null;
    postPrefix:   string;
    reporterName: string;
}

function buildUrl(prefix: string, slug: string): string {
    const p = prefix.trim().replace(/^\/+|\/+$/g, "");
    return p ? `/${p}/${slug}` : `/${slug}`;
}

export default function ReporterPostGrid({
    posts,
    activeBox,
    postPrefix,
    reporterName,
}: Props) {
    const activePlugins  = useActivePlugins();
    const [BoxComponent, setBoxComponent] = useState<any>(null);

    useEffect(() => {
        if (activePlugins === null) return;

        // Use blog-box templates — reporter posts are blog-like
        const boxes = getHooks("root.pages").filter(
            (p) => p.type === "blog-box" && p.slug === "dynamic"
        );

        let match = null;
        if (activeBox) {
            match =
                boxes.find(
                    (b) =>
                        b.label === activeBox.label &&
                        b.pluginNx === activeBox.pluginNx
                )?.component ?? null;
        }
        if (!match) {
            match =
                (boxes.find((b) => b.active === true) ?? boxes[0])
                    ?.component ?? null;
        }

        setBoxComponent(() => match);
    }, [activePlugins, activeBox]);

    // Loading skeleton
    if (activePlugins === null) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: Math.min(posts.length || 6, 6) }).map(
                    (_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl border border-gray-100 animate-pulse"
                        >
                            <div className="aspect-video bg-gray-100 rounded-t-2xl" />
                            <div className="p-4 space-y-2">
                                <div className="h-3.5 bg-gray-100 rounded w-4/5" />
                                <div className="h-3 bg-gray-100 rounded w-2/5" />
                            </div>
                        </div>
                    )
                )}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-20 text-gray-400">
                <p className="text-4xl mb-4">📝</p>
                <p className="text-lg font-medium text-gray-500">
                    {reporterName} hasn&apos;t published any posts yet.
                </p>
            </div>
        );
    }

    if (BoxComponent) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                    <BoxComponent
                        key={post._id}
                        data={post}
                        postUrl={buildUrl(postPrefix, post.slug)}
                    />
                ))}
            </div>
        );
    }

    // Fallback plain grid
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
                <Link
                    key={post._id}
                    href={buildUrl(postPrefix, post.slug)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 group"
                >
                    {post.info?.image && (
                        <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3">
                            <img
                                src={post.info.image}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-sky-600 transition-colors">
                        {post.title}
                    </p>
                    {post.info?.shortDescription && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {post.info.shortDescription}
                        </p>
                    )}
                </Link>
            ))}
        </div>
    );
}
