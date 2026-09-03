import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Heart, MapPin, MessageCircle, Pencil, Send, Users, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Business, Post } from "@workspace/api-client-react";
import { useCreateComment, useListComments, useReactToPost, useUpdatePost } from "@workspace/api-client-react";
import { Avatar, Button, Input } from "@/components/kit";
import { compactNumber, dateLabel, initials } from "@/lib/format";
import { TONES } from "@/lib/constants";

export function BusinessCard({ business, featured = false }: { business: Business; featured?: boolean }) {
  const tone = TONES[Number(business.id.replace(/\D/g, "").slice(-1) || 0) % TONES.length];
  const toneClass = {
    teal: "bg-[hsl(var(--primary))]",
    coral: "bg-[hsl(var(--accent))]",
    ochre: "bg-[hsl(var(--secondary))]",
    plum: "bg-[#57374d]",
  }[tone];
  return (
    <Link
      href={`/businesses/${business.slug}`}
      className={`group block overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] transition duration-300 hover:-translate-y-1 hover:shadow-xl ${featured ? "md:col-span-2" : ""}`}
    >
      <div className={`relative h-36 overflow-hidden ${toneClass}`}>
        {business.coverImageUrl && <img src={business.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-[hsl(var(--card))]/15" />
        <div className="absolute bottom-4 left-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-[hsl(var(--card))] bg-[hsl(var(--card))] text-lg font-bold text-[hsl(var(--primary))] shadow-lg">
          {business.logoUrl ? <img src={business.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(business.name)}
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-[hsl(var(--card))]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
          {business.verificationStatus === "verified" ? "Verified" : "Local listing"}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">{business.category.name}</p>
            <h3 className="display-font mt-1 text-xl font-bold group-hover:text-[hsl(var(--accent))]">{business.name}</h3>
          </div>
          <ArrowRight className="mt-1 text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1 group-hover:text-[hsl(var(--primary))]" size={19} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{business.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1"><MapPin size={13} /> {business.village}, {business.district}</span>
          <span className="flex items-center gap-1"><Users size={13} /> {compactNumber(business.memberCount)} members</span>
        </div>
      </div>
    </Link>
  );
}

export function PostCard({ post, canManage = false, onDelete }: { post: Post; canManage?: boolean; onDelete?: (id: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [comment, setComment] = useState("");
  const react = useReactToPost();
  const comments = useListComments(post.id, { query: { queryKey: ["/api/posts", post.id, "comments"], enabled: showComments } });
  const createComment = useCreateComment();
  const updatePost = useUpdatePost();
  const queryClient = useQueryClient();
  const liked = react.data?.liked ?? post.likedByMe;
  const likes = react.data?.likeCount ?? post.likeCount;

  return (
    <article className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
      <div className="flex items-start gap-3">
        <Avatar name={post.authorName} src={post.businessLogoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{post.businessName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{post.authorName} · {dateLabel(post.createdAt)}</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--secondary))]/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{post.type}</span>
          </div>
          {editing ? (
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                updatePost.mutate(
                  { id: post.id, data: { type: post.type, title, content } },
                  { onSuccess: () => setEditing(false) },
                );
              }}
            >
              <Input label="Title" value={title} onChange={setTitle} required />
              <Input label="Content" value={content} onChange={setContent} textarea required />
              <div className="flex gap-2">
                <Button type="submit" disabled={updatePost.isPending}>Save</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <h3 className="display-font mt-5 text-xl font-bold">{post.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[hsl(var(--muted-foreground))]">{post.content}</p>
              {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-4 max-h-72 w-full rounded-2xl object-cover" />}
            </>
          )}
          <div className="mt-5 flex items-center gap-2 border-t border-[hsl(var(--border))] pt-4">
            <button
              onClick={() => react.mutate({ id: post.id })}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition ${liked ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
            >
              <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likes}
            </button>
            <button onClick={() => setShowComments(!showComments)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
              <MessageCircle size={16} /> {post.commentCount}
            </button>
            {canManage && (
              <>
                <button onClick={() => setEditing(true)} className="ml-auto rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="Edit post">
                  <Pencil size={15} />
                </button>
                <button onClick={() => onDelete?.(post.id)} className="rounded-full p-2 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10" aria-label="Delete post">
                  <X size={15} />
                </button>
              </>
            )}
          </div>
          {showComments && (
            <div className="mt-4 border-t border-[hsl(var(--border))] pt-4">
              {comments.data?.length ? (
                <div className="space-y-3">
                  {comments.data.map((item) => (
                    <div key={item.id} className="flex gap-2 text-sm">
                      <Avatar name={item.userName} src={item.avatarUrl} size="sm" />
                      <div>
                        <p className="font-bold">{item.userName}</p>
                        <p className="text-[hsl(var(--muted-foreground))]">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Be the first to add a thought.</p>
              )}
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!comment.trim()) return;
                  createComment.mutate(
                    { id: post.id, data: { content: comment } },
                    {
                      onSuccess: () => {
                        setComment("");
                        queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "comments"] });
                      },
                    },
                  );
                }}
              >
                <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a thought..." className="h-10 min-w-0 flex-1 rounded-full border border-[hsl(var(--input))] bg-transparent px-4 text-sm outline-none" />
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" aria-label="Send comment">
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
