import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { uploadFile } from "../shared/api";
import { compressImage } from "../lib/imageCompress";
import { CATEGORY_TREE } from "../constants/feed";

const DEFAULT_SECTION_ID = CATEGORY_TREE[0]?.id ?? "";
const MAX_IMAGES = 10;

export function NewRequestScreen() {
  const { activeProfileType, authedPost, navigate, token } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categorySectionId, setCategorySectionId] = useState(DEFAULT_SECTION_ID);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [district, setDistrict] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentSection = CATEGORY_TREE.find((s) => s.id === categorySectionId);
  const subcategoryOptions = currentSection?.children ?? [];

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !token) {
      e.target.value = "";
      return;
    }
    const remaining = MAX_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      e.target.value = "";
      return;
    }
    const toProcess = Math.min(files.length, remaining);
    setErr(null);
    setUploading(true);
    setUploadingCount(toProcess);
    try {
      for (let i = 0; i < toProcess; i++) {
        const file = files[i]!;
        if (file.type && !file.type.startsWith("image/")) continue;
        let fileToUpload: File;
        try {
          fileToUpload = await compressImage(file);
        } catch {
          const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.type);
          if (!ok) {
            setErr("Не удалось обработать фото. Выберите JPEG или PNG.");
            setUploadingCount((c) => c - 1);
            continue;
          }
          fileToUpload = file;
        }
        const { url } = await uploadFile("/upload", fileToUpload, token);
        setImageUrls((prev) => [...prev, url].slice(0, MAX_IMAGES));
        setUploadingCount((c) => c - 1);
        setErr(null);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить фото");
      setUploadingCount(0);
    } finally {
      setUploading(false);
      setUploadingCount(0);
      setTimeout(() => { e.target.value = ""; }, 0);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    setErr(null);
    if (!categorySectionId?.trim()) {
      setErr("Выберите категорию");
      return;
    }
    if (!subcategoryId?.trim()) {
      setErr("Выберите подкатегорию");
      return;
    }
    const desc = description.trim();
    if (!desc) {
      setErr("Заполните описание заявки");
      return;
    }
    if (desc.length < 10) {
      setErr("Описание должно быть не короче 10 символов");
      return;
    }
    setSaving(true);
    try {
      const created = await authedPost<{ id: string }>("/requests", {
        category: subcategoryId,
        district: district || null,
        budget: budget ? Number(budget) : null,
        description: desc || null,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      navigate(`/requests/${created.id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setSaving(false);
    }
  };

  if (activeProfileType !== "parent") return <Navigate to="/requests" replace />;

  return (
    <div className="card">
      <div className="h2">Новая заявка</div>
      <p className="muted" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>
        Сервис «Для мам» — посредник между заказчиками и специалистами. Трудовые и гражданско‑правовые отношения возникают между пользователями; сервис не является работодателем и не участвует в оказании услуг.
      </p>
      {err && <div className="error-message" style={{ marginTop: 8 }} role="alert">{err}</div>}
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        <div className="field">
          <div className="label">Категория <span className="muted">(обязательно)</span></div>
          <select
            className="input"
            value={categorySectionId}
            onChange={(e) => {
              setCategorySectionId(e.target.value);
              setSubcategoryId("");
            }}
            required
          >
            {CATEGORY_TREE.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Подкатегория <span className="muted">(обязательно)</span></div>
          <select
            className="input"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            required
            disabled={!currentSection || subcategoryOptions.length === 0}
          >
            <option value="">Выберите подкатегорию</option>
            {subcategoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Район</div>
          <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Центральный" />
        </div>
        <div className="field">
          <div className="label">Бюджет (₽)</div>
          <input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
        </div>
        <div className="field">
          <div className="label">Описание <span className="muted">(не короче 10 символов)</span></div>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите задачу, пожелания, возраст ребёнка и т.п." />
        </div>
        <div className="field">
          <div className="label">Фото <span className="muted">(до {MAX_IMAGES})</span></div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
              {uploading && uploadingCount > 0 ? `Загрузка… (${uploadingCount})` : "+ Добавить фото"}
            </button>
          )}
          {(imageUrls.length > 0 || uploadingCount > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {imageUrls.map((url, i) => (
                <div key={url} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt=""
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, display: "block" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Удалить фото"
                    style={{
                      position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%",
                      border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 14, lineHeight: 1, cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {uploadingCount > 0 && Array.from({ length: uploadingCount }, (_, i) => (
                <div key={`u-${i}`} style={{ width: 72, height: 72, borderRadius: 8, background: "var(--color-bg-muted, #eee)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted, #666)", fontSize: 18 }}>…</div>
              ))}
            </div>
          )}
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => void onSubmit()} disabled={saving}>
            {saving ? "Создание…" : "Создать"}
          </button>
          <button className="btn secondary" onClick={() => navigate(-1)} disabled={saving}>
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}
