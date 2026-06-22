"use client";

/**
 * Admin — Reporter List  (/admin/reporter)
 *
 * Lists all users with type="reporter".
 * Admin can:
 *   1. Approve / suspend a reporter (reporter_approved toggle)
 *   2. Set that reporter's default post status: "draft" | "published"
 *      (stored in UserInfo as reporter_post_status)
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
    // from UserInfo
    reporter_approved?: string; // "1" | "0" | ""
    reporter_post_status?: string; // "draft" | "published"
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    active:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    inactive:  { label: "Inactive",  cls: "bg-gray-100 text-gray-500 ring-1 ring-gray-300" },
    suspended: { label: "Suspended", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

export default function ReporterList() {
    const [reporters, setReporters] = useState<Reporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState<string | null>(null);

    const fetchReporters = useCallback(async () => {
        setLoading(true);
        try {
            const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
            const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
            const res = await fetch(`${EXPRESS_API}/user?type=reporter`, {
                credentials: "include",
                headers: { "x-license-key": LICENSE_KEY },
                cache: "no-store",
            });
            const data = res.ok ? await res.json() : {};
            const users: Reporter[] = (data.users ?? []).filter(
                (u: any) => u.type === "reporter"
            );

            // Fetch UserInfo for each reporter to get approval status + post_status
            const enriched = await Promise.all(
                users.map(async (u) => {
                    try {
                        const ir = await fetch(`${EXPRESS_API}/user-info?userId=${u._id}`, {
                            credentials: "include",
                            headers: { "x-license-key": LICENSE_KEY },
                        });
                        if (!ir.ok) return u;
                        const id = await ir.json();
                        const infoArr: { name: string; value: string }[] = id.info ?? [];
                        const get = (k: string) =>
                            infoArr.find((i) => i.name === k)?.value ?? "";
                        return {
                            ...u,
                            reporter_approved:    get("reporter_approved"),
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

    /** Save a single UserInfo field for a reporter */
    const saveInfo = async (userId: string, key: string, value: string) => {
        setSaving(`${userId}-${key}`);
        try {
            const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
            const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
            await fetch(`${EXPRESS_API}/user-info`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "x-license-key": LICENSE_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, name: key, value }),
            });
            setReporters((prev) =>
                prev.map((r) =>
                    r._id === userId ? { ...r, [key]: value } : r
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
                    When <span className="font-mono font-semibold">Draft</span> is set, the reporter's submitted posts will
                    always be saved as drafts and require manual admin publishing.
                    When set to <span className="font-mono font-semibold">Published</span>, posts go live immediately
                    without review.
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
                            Assign the <span className="font-semibold text-sky-600">Reporter</span> role
                            from the Users admin page.
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
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">User Status</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Approved</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Post Default</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Joined</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((reporter) => {
                                const badge =
                                    STATUS_BADGE[reporter.status] ?? STATUS_BADGE.inactive;
                                const isApproved = reporter.reporter_approved === "1";
                                const postStatus = reporter.reporter_post_status || "draft";
                                const approveKey = `${reporter._id}-reporter_approved`;
                                const postStatusKey = `${reporter._id}-reporter_post_status`;

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
                                                    <p className="text-xs text-gray-400 font-mono">
                                                        /{reporter.slug}
                                                    </p>
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

                                        {/* User account status */}
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>

                                        {/* Reporter approved toggle */}
                                        <td className="px-5 py-3">
                                            <button
                                                onClick={() =>
                                                    saveInfo(
                                                        reporter._id,
                                                        "reporter_approved",
                                                        isApproved ? "0" : "1"
                                                    )
                                                }
                                                disabled={saving === approveKey}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
                                                    isApproved
                                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                        : "bg-red-50 text-red-600 hover:bg-red-100"
                                                }`}
                                            >
                                                {saving === approveKey ? (
                                                    <Icon icon="svg-spinners:ring-resize" width={13} />
                                                ) : (
                                                    <Icon
                                                        icon={isApproved ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                                                        width={13}
                                                    />
                                                )}
                                                {isApproved ? "Approved" : "Not Approved"}
                                            </button>
                                        </td>

                                        {/* Post default status */}
                                        <td className="px-5 py-3">
                                            <select
                                                value={postStatus}
                                                disabled={saving === postStatusKey}
                                                onChange={(e) =>
                                                    saveInfo(
                                                        reporter._id,
                                                        "reporter_post_status",
                                                        e.target.value
                                                    )
                                                }
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
