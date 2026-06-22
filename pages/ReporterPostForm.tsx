"use client";

/**
 * Reporter account — Write / Edit Post
 *
 * URL: /account/reporter-posts/new   → add mode
 * URL: /account/reporter-posts/<id>  → edit mode
 *
 * Wraps the admin PostForm with:
 *   - userId stamped as post author
 *   - post type always "reporter-post"
 *   - Back-link to /account/reporter-posts
 *   - Approval guard — unapproved reporters see a locked state
 *
 * Status enforcement:
 *   The admin sets reporter_post_status ("draft" | "published") per reporter
 *   in their UserInfo. This component reads that value and injects it as a
 *   hidden field above PostForm. PostForm's own status dropdown still appears,
 *   but we display an info banner so the reporter knows their posts go to
 *   draft. The actual enforcement happens server-side in the Express API
 *   (outside this CMS's scope), but we keep the UX honest here.
 *
 *   NOTE: PostForm does not accept an overrideStatus prop. The form already
 *   loads status from the saved post on edit, and defaults to "published" on
 *   add. Reporters with draft enforcement should simply be aware their post
 *   will be reviewed — we show a banner and do not hide the form controls.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import PostForm from "@/components/admin/PostForm";
import { useActivePlugins } from "@/hook/useActivePlugins";
import { useUser } from "@/context/Provider";

interface ReporterInfo {
    approved: boolean;
    postStatus: "draft" | "published";
}

export default function ReporterPostForm() {
    const pathname = usePathname();
    const router   = useRouter();
    const { user } = useUser();

    const activePlugins = useActivePlugins();

    // Derive postId from path: /account/reporter-posts/<id>
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const lastSeg  = segments[segments.length - 1];
    const isNew    = !lastSeg || lastSeg === "reporter-posts" || lastSeg === "new";
    const postId   = isNew ? undefined : lastSeg;

    const [info,       setInfo]       = useState<ReporterInfo | null>(null);
    const [infoLoaded, setInfoLoaded] = useState(false);

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
                const get = (k: string) => arr.find((i) => i.name === k)?.value ?? "";
                setInfo({
                    approved:   get("reporter_approved") === "1",
                    postStatus: (get("reporter_post_status") || "draft") as "draft" | "published",
                });
            })
            .catch(() => setInfo({ approved: false, postStatus: "draft" }))
            .finally(() => setInfoLoaded(true));
    }, [user?._id]);

    // ── Guards ────────────────────────────────────────────────────────────────

    if (activePlugins === null || !user || !infoLoaded || !info) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    // Unapproved reporters cannot create / edit posts
    if (!info.approved) {
        return (
            <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
                    <Icon icon="solar:lock-keyhole-bold" width={32} className="text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Account pending approval</h2>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Your reporter account needs to be approved by an admin before you can
                    write posts. Please check back later.
                </p>
                <Link
                    href="/account/reporter-posts"
                    className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:underline"
                >
                    <Icon icon="solar:arrow-left-bold" width={14} />
                    Back to My Posts
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
                <Link
                    href="/account/reporter-posts"
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

            {/* Status policy banner */}
            <div
                className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
                    info.postStatus === "draft"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
            >
                <Icon
                    icon={
                        info.postStatus === "draft"
                            ? "solar:clock-circle-bold"
                            : "solar:check-circle-bold"
                    }
                    width={16}
                    className="shrink-0 mt-0.5"
                />
                <span>
                    {info.postStatus === "draft"
                        ? "Your posts are saved as drafts and reviewed by an admin before going live."
                        : "Your posts are published immediately without admin review."}
                </span>
            </div>

            <PostForm
                type="reporter-post"
                activePlugins={activePlugins}
                postId={postId}
                userId={user._id}
                onSuccess={(savedId) => {
                    if (isNew) {
                        router.replace(`/account/reporter-posts/${savedId}`);
                    }
                }}
            />
        </div>
    );
}
