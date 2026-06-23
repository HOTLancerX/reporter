"use client";

/**
 * Reporter account — My Posts  (/account/post/blog)
 *
 * Lists all blog posts authored by this reporter (type="blog", userId=me).
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useUser } from "@/context/Provider";
import { useRouter } from "next/navigation";
import { xFetch } from "@/lib/express";

interface ReporterPost {
    _id:       string;
    title:     string;
    slug:      string;
    status:    string;
    createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    published: { label: "Published", dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
    draft:     { label: "Draft",     dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700"  },
    trash:     { label: "Trash",     dot: "bg-red-400",     bg: "bg-red-50",     text: "text-red-700"    },
};

/** Build a public URL respecting the stored permalink prefix */
function buildViewUrl(permalinks: Record<string, string>, type: string, slug: string): string {
    const prefix = (permalinks[type] ?? "").trim().replace(/^\/+|\/+$/g, "");
    return prefix ? `/${prefix}/${slug}` : `/${slug}`;
}

export default function ReporterPostList() {
    const { user } = useUser();
    const router   = useRouter();

    const [posts,      setPosts]      = useState<ReporterPost[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [deleting,   setDeleting]   = useState<string | null>(null);
    const [filter,     setFilter]     = useState("");
    const [permalinks, setPermalinks] = useState<Record<string, string>>({});

    // Only reporters may access this page
    useEffect(() => {
        if (user && user.type !== "reporter") {
            router.replace("/account");
        }
    }, [user, router]);

    // Load permalink map once
    useEffect(() => {
        xFetch("/permalink", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => { if (data && typeof data === "object" && !data.error) setPermalinks(data); })
            .catch(() => {});
    }, []);

    const fetchPosts = useCallback(async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
            const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
            const res = await fetch(
                `${EXPRESS_API}/post?type=blog&userId=${encodeURIComponent(user._id)}`,                {
                    credentials: "include",
                    headers: { "x-license-key": LICENSE_KEY },
                    cache: "no-store",
                }
            );
            if (res.ok) {
                const data = await res.json();
                const raw: any[] = Array.isArray(data) ? data : (data.posts ?? data.data ?? []);
                setPosts(
                    raw.map((p: any) => ({
                        _id:       String(p._id),
                        title:     String(p.title     ?? ""),
                        slug:      String(p.slug      ?? ""),
                        status:    String(p.status    ?? "draft"),
                        createdAt: String(p.createdAt ?? ""),
                    }))
                );
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [user?._id]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        setDeleting(id);
        try {
            const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
            const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
            await fetch(`${EXPRESS_API}/post?id=${id}`, {
                method: "DELETE",
                credentials: "include",
                headers: { "x-license-key": LICENSE_KEY },
            });
            setPosts((prev) => prev.filter((p) => p._id !== id));
        } catch { /* silent */ }
        finally { setDeleting(null); }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    // Non-reporters are redirected by useEffect above; render nothing while that fires
    if (user.type !== "reporter") return null;

    const filtered = filter ? posts.filter((p) => p.status === filter) : posts;
    const counts   = posts.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl font-black text-gray-900">My Posts</h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {loading ? "Loading…" : `${posts.length} post${posts.length !== 1 ? "s" : ""} total`}
                    </p>
                </div>
                <Link
                    href="/account/post/blog/new"
                    className="inline-flex items-center gap-2 bg-linear-to-r from-sky-500 to-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:shadow-md hover:shadow-sky-200 hover:-translate-y-px transition-all text-sm"
                >
                    <Icon icon="solar:add-circle-bold" width={18} />
                    Write Post
                </Link>
            </div>

            {/* Status filter tabs */}
            {!loading && posts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setFilter("")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            !filter ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        All
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${!filter ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                            {posts.length}
                        </span>
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key === filter ? "" : key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filter === key ? `${cfg.bg} ${cfg.text}` : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            {counts[key] !== undefined && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? "bg-black/10" : "bg-gray-100 text-gray-500"}`}>
                                    {counts[key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                                <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                        <Icon icon="solar:document-bold" width={32} className="text-sky-400" />
                    </div>
                    <p className="text-base font-bold text-gray-600">
                        {filter ? `No ${STATUS_CONFIG[filter]?.label ?? filter} posts` : "No posts yet"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1 mb-5">
                        {filter ? "Try a different filter." : "Write your first blog post."}
                    </p>
                    {!filter && (
                        <Link
                            href="/account/post/blog/new"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-semibold hover:shadow-md hover:-translate-y-px transition-all"
                        >
                            <Icon icon="solar:add-circle-bold" width={16} />
                            Write your first post
                        </Link>
                    )}
                </div>
            )}

            {/* Post list */}
            {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map((post) => {
                        const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
                        return (
                            <div key={post._id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                <div className="flex items-center gap-4 px-5 py-4">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} title={cfg.label} />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-sky-600 transition-colors">
                                            {post.title || "Untitled post"}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                                                {cfg.label}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {post.createdAt ? new Date(post.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/account/post/blog/${post._id}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                        >
                                            <Icon icon="solar:pen-bold" width={13} />
                                            Edit
                                        </Link>
                                        {post.status === "published" && (
                                            <Link href={buildViewUrl(permalinks, "blog", post.slug)} target="_blank"
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                                                <Icon icon="solar:eye-bold" width={13} />
                                                View
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => handleDelete(post._id)}
                                            disabled={deleting === post._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-50"
                                        >
                                            {deleting === post._id
                                                ? <Icon icon="svg-spinners:ring-resize" width={13} />
                                                : <Icon icon="solar:trash-bin-trash-bold" width={13} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
