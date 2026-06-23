"use client";

/**
 * Admin — Reporter List  (/admin/reporter)
 *
 * Lists all users with type="reporter".
 *
 * Access model:
 *   Any user with type="reporter" and status="active" can post immediately.
 *   To grant reporter access the admin simply sets user.type to "reporter"
 *   via the standard Users admin page — no separate approval step needed.
 *
 * Admin can set each reporter's default post status:
 *   "draft"     → posts go to draft and require admin review before going live
 *   "published" → posts go live immediately without review
 *   Stored in UserInfo as reporter_post_status.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface Reporter {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    image?: string;
    slug: string;
    status: "active" | "inactive" | "suspended";
    createdAt: string;
    reporter_post_status?: string; // "draft" | "published"
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    active:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    inactive:  { label: "Inactive",  cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-300" },
    suspended: { label: "Suspended", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

export default function ReporterList() {
    const [reporters, setReporters] = useState<Reporter[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState("");
    const [saving,    setSaving]    = useState<string | null>(null);

    const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
    const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
    const headers = { "x-license-key": LICENSE_KEY };

    const fetchReporters = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${EXPRESS_API}/user?type=reporter`, {
                credentials: "include",
                headers,
                cache: "no-store",
            });
            const data = res.ok ? await res.json() : {};
            const users: Reporter[] = (data.users ?? []).filter(
                (u: any) => u.type === "reporter"
            );

            // Fetch reporter_post_status from UserInfo for each reporter
            const enriched = await Promise.all(
                users.map(async (u) => {
                    try {
                        const ir = await fetch(`${EXPRESS_API}/user-info?userId=${u._id}`, {
                            credentials: "include",
                            headers,
                        });
                        if (!ir.ok) return u;
                        const id = await ir.json();
                        const arr: { name: string; value: string }[] = id.info ?? [];
                        const get = (k: string) => arr.find((i) => i.name === k)?.value ?? "";
                        return {
                            ...u,
                            reporter_post_status: get("reporter_post_status") || "draft",
                        };
                    } catch {
                        return u;
                    }
                })
            );

            setReporters(enriched);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchReporters(); }, [fetchReporters]);

    /** Save reporter_post_status in UserInfo */
    const savePostStatus = async (userId: string, value: string) => {
        setSaving(userId);
        try {
            await fetch(`${EXPRESS_API}/user-info`, {
                method: "POST",
                credentials: "include",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ userId, name: "reporter_post_status", value }),
            });
            setReporters((prev) =>
                prev.map((r) =>
                    r._id === userId ? { ...r, reporter_post_status: value } : r
                )
            );
        } catch { /* silent */ }
        finally { setSaving(null); }
    };

    const filtered = reporters.filter(
        (r) =>
            !search ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reporters</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {reporters.length} reporter{reporters.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Link
                    href="/admin/users/add"
                    className="inline-flex items-center gap-2 bg-linear-to-r from-sky-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                >
                    <Icon icon="solar:user-plus-bold" width={18} />
                    Add Reporter
                </Link>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Icon
                    icon="solar:magnifer-linear"
                    width={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reporters…"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                />
            </div>

            {/* Info panel */}
            <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                    <Icon icon="solar:info-circle-bold" width={15} />
                    Post default status
                </p>
                <p className="text-sky-600 text-xs">
                    <span className="font-mono font-semibold">Draft</span> — reporter's posts require admin review before going live.{" "}
                    <span className="font-mono font-semibold">Published</span> — posts go live immediately.
                    To grant or revoke reporter access, edit the user's role in the{" "}
                    <Link href="/admin/users" className="underline hover:text-sky-800">Users</Link> admin.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Icon icon="svg-spinners:ring-resize" width={32} />
                </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon="solar:document-bold" width={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">
                        {search ? "No reporters match your search." : "No reporters yet."}
                    </p>
                    {!search && (
                        <p className="text-sm mt-1 text-gray-400">
                            Assign the{" "}
                            <span className="font-semibold text-sky-600">Reporter</span> role from the{" "}
                            <Link href="/admin/users" className="underline hover:text-gray-600">
                                Users admin
                            </Link>.
                        </p>
                    )}
                </div>
            )}

            {/* Table */}
            {!loading && filtered.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Reporter</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Contact</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Post Default</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Joined</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((reporter) => {
                                const badge      = STATUS_BADGE[reporter.status] ?? STATUS_BADGE.inactive;
                                const postStatus = reporter.reporter_post_status || "draft";

                                return (
                                    <tr key={reporter._id} className="hover:bg-gray-50 transition">

                                        {/* Avatar + name */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {reporter.image ? (
                                                    <img
                                                        src={reporter.image}
                                                        alt={reporter.name}
                                                        className="w-9 h-9 rounded-xl object-cover ring-2 ring-sky-100"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-sm">
                                                        {reporter.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{reporter.name}</p>
                                                    <p className="text-xs text-gray-400 font-mono">/{reporter.slug}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-5 py-3 text-gray-500">
                                            <p>{reporter.email}</p>
                                            {reporter.phone && (
                                                <p className="text-xs text-gray-400">{reporter.phone}</p>
                                            )}
                                        </td>

                                        {/* Account status */}
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>

                                        {/* Post default status picker */}
                                        <td className="px-5 py-3">
                                            <select
                                                value={postStatus}
                                                disabled={saving === reporter._id}
                                                onChange={(e) => savePostStatus(reporter._id, e.target.value)}
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
                                            >
                                                <option value="draft">Draft (needs review)</option>
                                                <option value="published">Published (auto-live)</option>
                                            </select>
                                        </td>

                                        {/* Joined */}
                                        <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                                            {new Date(reporter.createdAt).toLocaleDateString()}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/admin/users/${reporter._id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                            >
                                                <Icon icon="solar:pen-bold" width={13} />
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
