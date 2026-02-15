import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { uploadFile } from "../shared/api";
import { compressImage } from "../lib/imageCompress";

const MIN_LENGTH = 10;
const MAX_IMAGES = 10;

export function NewPostScreen() {
  const { authedPost, setFeedReloadKey, token } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !token) return;
    e.target.value = "";
    const remaining = MAX_IMAGES - imageUrls.length;
    if (remaining <= 0) return;
    setUploading(true);
    setErr(null);
    try {
      const toAdd: string[] = [];
      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        const compressed = await compressImage(file);
        const { url } = await uploadFile("/upload", compressed, token);
        toAdd.push(url);
      }
      setImageUrls((prev) => [...prev, ...toAdd].slice(0, MAX_IMAGES));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const text = content.trim();
    if (!text) {
      setErr("Напишите текст объявления");
      return;
    }
    if (text.length < MIN_LENGTH) {
      setErr(`Текст должен быть не короче ${MIN_LENGTH} символов`);
      return;
    }
    setSaving(true);
    try {
      const data = await authedPost<{ id?: string; ok?: boolean; error?: string }>("/posts", {
        content: text,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      if (data.ok === false && data.error) {
        setErr(data.error);
        return;
      }
      if (data.id) {
        setFeedReloadKey((k) => k + 1);
        navigate(`/posts/${data.id}`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось опубликовать");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="h2">Добавить объявление</div>
      <p className="muted" style={{ marginTop: 6, marginBottom: 12, fontSize: 13 }}>
        Ваше объявление увидят и мамы, и специалисты в разделе «Другое».
      </p>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <div className="label">Текст <span className="muted">(не короче {MIN_LENGTH} символов)</span></div>
          <textarea
            className="input textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Напишите объявление..."
            rows={5}
            style={{ resize: "vertical", minHeight: 100 }}
            minLength={MIN_LENGTH}
          />
        </div>
        <div className="field">
          <div className="label">Фото <span className="muted">(до {MAX_IMAGES}, тяжёлые сжимаются)</span></div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            style={{ display: "none" }}
            onChange={onFileChange}
          />
          {imageUrls.length < MAX_IMAGES && (
            <button
              type="button"
              className="btn secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Загрузка…" : "+ Добавить фото"}
            </button>
          )}
          {imageUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {imageUrls.map((url, i) => (
                <div key={url} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt=""
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Удалить фото"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {err && (
          <div className="error-message" role="alert">
            {err}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Публикация…" : "Опубликовать"}
          </button>
          <Link className="btn secondary" to="/">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
