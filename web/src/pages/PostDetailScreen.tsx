import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ErrorBox } from "../components/ErrorBox";
import { getAvatarSrc } from "../lib/avatar";
import { formatRequestCreatedAt } from "../lib/format";

type PostDetail = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    displayName: string;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    contactPhone?: string | null;
    username?: string | null;
  };
};

export function PostDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { authedGet } = useApp();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setErr(null);
    setPost(null);
    const run = async () => {
      try {
        const data = await authedGet<PostDetail | null>(`/posts/${id}`);
        if (!cancelled && data) setPost(data);
        if (!cancelled && data === null) setErr("Объявление не найдено");
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Не удалось загрузить");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [id, authedGet]);

  if (err) return <ErrorBox error={err} />;
  if (!post) return <div className="card">Загрузка…</div>;

  const author = post.author;
  const avatarSrc = getAvatarSrc(author.avatarUrl, author.photoUrl, null);
  const tgUsername = author.username?.trim() || null;
  const tgUrl = tgUsername ? `https://t.me/${tgUsername}` : null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card profile-card">
        <div className="profile-card-header">
          <div className="profile-card-avatar-wrap">
            <div className="profile-card-avatar">
              <img src={avatarSrc} alt="" />
            </div>
          </div>
          <div className="profile-card-title-block">
            <h1 className="h2 profile-card-title" style={{ margin: 0 }}>
              {author.displayName}
            </h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
              {formatRequestCreatedAt(post.createdAt)}
            </p>
          </div>
        </div>
        <div className="profile-card-about-text" style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
          {post.content}
        </div>
        {(author.contactPhone || tgUrl) && (
          <div className="profile-view-dl" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
            {author.contactPhone && (
              <div className="profile-view-row" style={{ marginBottom: 8 }}>
                <dt className="muted">Телефон</dt>
                <dd>
                  <a href={`tel:${author.contactPhone}`}>{author.contactPhone}</a>
                </dd>
              </div>
            )}
            {tgUrl && (
              <div style={{ marginTop: 12 }}>
                <a
                  className="btn btn-telegram btn-with-icon"
                  href={tgUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Написать в Telegram
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="row">
        <Link className="btn secondary" to="/">
          В ленту
        </Link>
      </div>
    </div>
  );
}
