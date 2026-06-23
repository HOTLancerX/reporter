"use client";

/**
 * Reporter account — Write / Edit Blog Post
 *
 * URL: /account/post/blog/new   → add mode
 * URL: /account/post/blog/<id>  → edit mode
 *
 * Reporters post to the existing "blog" type — no separate post type.
 * Mirrors SellerProductForm: wraps the admin PostForm with the reporter's
 * userId stamped as author.
 *
 * Post-status default (draft / published) is stored per-reporter in UserInfo
 * as reporter_post_status and set by the admin in /admin/reporter.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import PostForm from "@/components/admin/PostForm";
import { useActivePlugins } from "@/hook/useActivePlugins";
import { useUser } from "@/context/Provider";

export default function ReporterPostForm() {
    const pathname = usePathname();
    const router   = useRouter();
    const { user } = useUser();

    const activePlugins = useActivePlugins();

    // Derive postId from path: /account/post/blog/<id>
    // segments: ["account", "post", "blog"] | ["account", "post", "blog", "<id>"]
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const lastSeg  = segments[segments.length - 1];
    const isNew    = !lastSeg || lastSeg === "blog" || lastSeg === "new";
    const postId   = isNew ? undefined : lastSeg;

    // Per-reporter post-status default
    const [postStatus,  setPostStatus]  = useState<"draft" | "published">("draft");
    const [statusReady, setStatusReady] = useState(false);

    // Only reporters may access this page
    useEffect(() => {
        if (user && user.type !== "reporter") {
            router.replace("/account");
        }
    }, [user, router]);

    useEffect(() => {
        if (!user?._id) return;
        const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
        const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
        fetch(`${EXPRESS_API}/user-info?userId=${user._id}`, {
            credentials: "include",
            headers: { "x-license-key": LICENSE_KEY },
        })
            .then((r) => (r.ok ? r.json() : { info: [] }))
            .then((data) => {
                const arr: { name: string; value: string }[] = data.info ?? [];
                const val = arr.find((i) => i.name === "reporter_post_status")?.value ?? "draft";
                setPostStatus(val === "published" ? "published" : "draft");
            })
            .catch(() => { /* keep default "draft" */ })
            .finally(() => setStatusReady(true));
    }, [user?._id]);

    if (activePlugins === null || !user || !statusReady) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    // Non-reporters are redirected by the useEffect above; render nothing while that fires
    if (user.type !== "reporter") return null;

    return (
        <div className="space-y-6">

            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
                <Link
                    href="/account/post/blog"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
                >
                    <Icon icon="solar:arrow-left-bold" width={16} />
                    My Posts
                </Link>
                <span className="text-gray-300">/</span>
                <h1 className="text-2xl font-bold">
                    {isNew ? "Write Post" : "Edit Post"}
                </h1>
            </div>

            {/* Post-status policy banner */}
            <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
                postStatus === "draft"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
                <Icon
                    icon={postStatus === "draft" ? "solar:clock-circle-bold" : "solar:check-circle-bold"}
                    width={16}
                    className="shrink-0 mt-0.5"
                />
                <span>
                    {postStatus === "draft"
                        ? "Your posts are saved as drafts and reviewed by an admin before going live."
                        : "Your posts are published immediately without admin review."}
                </span>
            </div>

            <PostForm
                type="blog"
                activePlugins={activePlugins}
                postId={postId}
                userId={user._id}
                onSuccess={(savedId) => {
                    if (isNew) {
                        router.replace(`/account/post/blog/${savedId}`);
                    }
                }}
            />
        </div>
    );
}
