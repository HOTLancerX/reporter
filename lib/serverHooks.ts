/**
 * plugin/reporter/lib/serverHooks.ts — Server-only hook registration.
 *
 * Auto-discovered by hook/serverDataHooks.ts via require.context.
 *
 * Registers a data provider for the "reporter" content type:
 *   - Reads data.info.userId (the reporter's user _id, resolved by the slug
 *     router before calling this hook)
 *   - Fetches User record + UserInfo (bio, website, twitter)
 *   - Fetches all published reporter-posts whose PostInfo userId === that user
 *   - Returns fully-serialized plain objects — no ObjectId / Date / Buffer
 *
 * NEVER import from plugin/reporter/index.ts or any client component.
 */

import { registerServerDataHook } from "@/hook/serverDataHooks";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import User from "@/models/Users";
import UserInfo from "@/models/Users_info";

registerServerDataHook("reporter", async (_id, _slug, data) => {
    try {
        await connectDB();

        // The slug router passes the resolved user _id via data.info.userId
        const userIdInfo = data?.info?.userId as string | undefined;
        if (!userIdInfo) return { reporter: null, posts: [], activeBox: null };

        // ── Fetch user ────────────────────────────────────────────────────────
        const user = await User.findById(userIdInfo).lean() as any;
        if (!user) return { reporter: null, posts: [], activeBox: null };

        const userInfoDocs = await UserInfo.find({ userId: user._id }).lean() as any[];
        const uiMap: Record<string, string> = {};
        userInfoDocs.forEach((d: any) => { uiMap[d.name] = String(d.value ?? ""); });

        // Any active user with type="reporter" is shown publicly — no extra
        // approval flag needed. Access is granted by setting user.type="reporter".
        if (user.type !== "reporter") {
            return { reporter: null, posts: [], activeBox: null };
        }

        // ── Find all published blog posts by this reporter ────────────────────
        // Query post.userId directly — no PostInfo join needed
        const posts = await Post.find({
            type:   "blog",
            status: "published",
            userId: String(user._id),
        }).sort({ createdAt: -1 }).lean() as any[];

        // Enrich + fully serialize (no Mongoose types on any field)
        const enrichedPosts = await Promise.all(
            posts.map(async (post: any) => {
                const infoRecords = await PostInfo.find({ postId: post._id }).lean() as any[];
                const infoMap: Record<string, string> = {};
                infoRecords.forEach((r: any) => { infoMap[r.name] = String(r.value ?? ""); });
                return {
                    _id:   String(post._id),
                    title: String(post.title ?? ""),
                    slug:  String(post.slug  ?? ""),
                    info:  infoMap,
                };
            })
        );

        // Fully-serialized reporter record — no Mongoose types
        const reporter = {
            _id:     String(user._id),
            name:    String(user.name    ?? ""),
            slug:    String(user.slug    ?? ""),
            image:   String(user.image   ?? ""),
            type:    String(user.type    ?? ""),
            bio:     String(uiMap.bio     ?? ""),
            website: String(uiMap.website ?? ""),
            twitter: String(uiMap.twitter ?? ""),
            city:    String(user.city    ?? ""),
            state:   String(user.state   ?? ""),
        };

        return { reporter, posts: enrichedPosts, activeBox: null };
    } catch (err) {
        console.error("Reporter serverDataHook error:", err);
        return { reporter: null, posts: [], activeBox: null };
    }
});
