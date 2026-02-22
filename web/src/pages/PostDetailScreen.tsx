import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ErrorBox } from "../components/ErrorBox";
import { ImageSlider } from "../components/ImageSlider";
import { AvatarImage } from "../components/AvatarImage";
import { formatRequestCreatedAt } from "../lib/format";
import { openContactUrl } from "../shared/openContactUrl";

type PostDetail = {
  id: string;
  content: string;
  images?: string[];
  createdAt: string;
  authorProfileId?: string;
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
  const { authedGet, authedDelete, activeProfileId, setFeedReloadKey, navigate, isAdmin, platform, isMiniApp } = useApp();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  const tgUsername = author.username?.trim() || null;
  const tgUrl = tgUsername ? `https://t.me/${tgUsername}` : null;
  const maxProfileUrl = (author as { maxProfileUrl?: string | null }).maxProfileUrl?.trim() || null;
  const contactUrl = platform === "max" && maxProfileUrl ? maxProfileUrl : tgUrl;
  const isAuthor = Boolean(post.authorProfileId && activeProfileId && post.authorProfileId === activeProfileId);
  const canDelete = isAuthor || isAdmin;

  const onDelete = async () => {
    if (!id || !confirm("Удалить объявление?")) return;
    setDeleting(true);
    setErr(null);
    try {
      await authedDelete(`/posts/${id}`);
      setFeedReloadKey((k) => k + 1);
      navigate("/requests", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card profile-card">
        <div className="profile-card-header">
          <div className="profile-card-avatar-wrap">
            <div className="profile-card-avatar">
              <AvatarImage avatarUrl={author.avatarUrl} telegramPhotoUrl={author.photoUrl} />
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
        {post.images && post.images.length > 0 && (
          <ImageSlider images={post.images} alt="Фото объявления" height={280} />
        )}
        {(author.contactPhone || contactUrl) && (
          <div className="profile-view-dl" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
            {author.contactPhone && (
              <div className="profile-view-row" style={{ marginBottom: 8 }}>
                <dt className="muted">Телефон</dt>
                <dd>
                  <a href={`tel:${author.contactPhone}`}>{author.contactPhone}</a>
                </dd>
              </div>
            )}
            {contactUrl && (
              <div style={{ marginTop: 12 }}>
                {isMiniApp ? (
                  <button
                    type="button"
                    className="btn btn-telegram btn-with-icon"
                    onClick={() => openContactUrl(contactUrl)}
                  >
                    {platform === "max" ? "Связаться через MAX" : "Написать в Telegram"}
                  </button>
                ) : (
                  <a
                    className="btn btn-telegram btn-with-icon"
                    href={contactUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {platform === "max" ? "Связаться через MAX" : "Написать в Telegram"}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <Link className="btn secondary" to="/">
          В ленту
        </Link>
        {canDelete && (
          <button
            type="button"
            className="btn secondary"
            disabled={deleting}
            onClick={() => void onDelete()}
            style={{ color: "var(--error)" }}
          >
            {deleting ? "Удаление…" : isAdmin ? "Удалить объявление (админ)" : "Удалить объявление"}
          </button>
        )}
      </div>
    </div>
  );
}
