# Категория специалиста (skills): как работает и где лежит код

## Проблема

Пользователь выбирает категорию «Досуг», нажимает «Сохранить». После сохранения в поле снова показывается «Няня» вместо «Досуг».

---

## Общий поток данных

1. **Экран профиля** — пользователь видит `<select>` с категориями. Значение берётся из состояния `specialistCategory`.
2. **Сохранение** — по кнопке «Сохранить» вызывается `save()`, который шлёт PATCH на `/profiles/:id/specialist` с телом `{ skills: ["Досуг"], ... }`.
3. **Бэкенд** — принимает PATCH, сохраняет `skills` в таблицу `specialist_profiles` (поле `skills`, тип `Json`).
4. **После сохранения** — фронт вызывает `refreshMe()` (GET `/me`), получает обновлённые профили с `specialist.skills`.
5. **Синхронизация с формой** — `useEffect` с зависимостью `[activeProfile]` читает `activeProfile.specialist.skills[0]` и вызывает `setSpecialistCategory(...)`.
6. **Отображение** — `<select value={specialistCategory || SPECIALIST_CATEGORIES[0]} />`. Если `specialistCategory` пустая строка, показывается первая категория «Няня».

Где рвётся цепочка: либо бэкенд не записывает/не отдаёт `["Досуг"]`, либо фронт после `refreshMe()` снова ставит пустую строку и пользователь видит fallback «Няня».

---

## Где что лежит в коде

### Фронт (React)

**Файл:** `web/src/App.tsx`

- **Константа категорий** (строка ~39):
  ```ts
  const SPECIALIST_CATEGORIES = ["Няня", "Репетитор", "Досуг"] as const;
  ```

- **Состояние категории в форме профиля** (строка ~966):
  ```ts
  const [specialistCategory, setSpecialistCategory] = useState("");
  ```

- **Откуда берётся текущий профиль** (строки ~274–277):
  ```ts
  const activeProfile = useMemo(() => {
    if (!me?.activeProfileId) return null;
    return me.profiles.find((p) => p.id === me.activeProfileId) ?? null;
  }, [me]);
  ```
  То есть `activeProfile` — это элемент из `me.profiles`, у которого `id === me.activeProfileId`. Данные приходят из GET `/me`.

- **Синхронизация формы с данными профиля** (строки ~973–989):
  ```ts
  useEffect(() => {
    if (!activeProfile) return;
    setDisplayName(activeProfile.displayName ?? "");
    setCity(activeProfile.city ?? "");
    setDistrict(activeProfile.district ?? "");
    if (activeProfile.type === "specialist") {
      const spec = activeProfile.specialist;
      if (spec) {
        setPricePerHour(...);
        setAbout(...);
        const firstSkill = Array.isArray(spec.skills) && spec.skills.length > 0 ? spec.skills[0] : "";
        setSpecialistCategory(firstSkill);
      } else {
        setSpecialistCategory("");
      }
    }
  }, [activeProfile]);
  ```
  Важно: категория в форме выставляется **только** из `activeProfile.specialist.skills[0]`. Если `spec.skills` пустой или отсутствует — в состоянии ставится `""`.

- **Сохранение профиля специалиста** (строки ~1026–1036):
  ```ts
  if (type === "specialist") {
    const payload = [specialistCategory || SPECIALIST_CATEGORIES[0]].filter(Boolean);
    const specRes = await authedPatch<{ skills?: string[] }>(`/profiles/${profileId}/specialist`, {
      skills: payload.length ? payload : [],
      pricePerHour: ...,
      about: ...,
    });
    if (Array.isArray(specRes?.skills) && specRes.skills[0]) {
      setSpecialistCategory(specRes.skills[0]);
    }
  }
  await refreshMe();
  ```
  Отправляется массив `skills` (один элемент — выбранная категория). После ответа PATCH, если в ответе есть `skills[0]`, им обновляют `specialistCategory`. Затем вызывается `refreshMe()`.

- **Обновление данных пользователя** (строки ~413–417):
  ```ts
  const refreshMe = async () => {
    if (!token) return;
    const data = await getJSON<MeResponse>("/me", token);
    setMe(data);
  };
  ```
  После `setMe(data)` пересчитывается `activeProfile` (он из `me.profiles`), срабатывает эффект выше и снова вызывается `setSpecialistCategory(activeProfile.specialist.skills[0] ?? "")`.

- **Отображение в селекте** (строки ~1099–1111):
  ```ts
  <select
    value={specialistCategory || SPECIALIST_CATEGORIES[0]}
    onChange={(e) => setSpecialistCategory(e.target.value)}
  >
    {SPECIALIST_CATEGORIES.map((c) => (
      <option key={c} value={c}>{c}</option>
    ))}
  </select>
  ```
  Если `specialistCategory === ""`, пользователь видит первую опцию — «Няня».

**Тип ответа /me** (строки ~18–36): в `MeResponse` у элемента `profiles[]` для специалиста есть поле:
`specialist?: { skills: string[]; pricePerHour?: number | null; about?: string | null }`.

**Вызов API** (PATCH): `web/src/shared/api.ts` — функция `patchJSON(path, body, token)`, вызывается через `authedPatch` в App.tsx (тот же файл).

---

### Бэкенд (NestJS)

**1. PATCH `/profiles/:id/specialist` — приём и сохранение**

- **Роут и тело запроса:** `api/src/profiles/profiles.controller.ts` (строки ~204–228):
  ```ts
  @Patch(":id/specialist")
  async updateSpecialist(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: {
      skills?: string[] | null;
      ...
    },
  ) {
    const { userId } = (req as unknown as AuthedRequest).auth!;
    const specialist = await this.profiles.updateSpecialist(userId, BigInt(id), body ?? {});
    return {
      profileId: specialist.profileId.toString(),
      skills: specialist.skills,  // возвращаем то, что вернул Prisma после upsert
      ...
    };
  }
  ```
  Тело приходит как есть от фронта (например `{ skills: ["Досуг"], ... }`). Ответ отдаёт `specialist.skills` после записи в БД.

- **Запись в БД:** `api/src/profiles/profiles.service.ts` (строки ~94–136):
  - Метод `updateSpecialist(userId, profileId, data)`.
  - `data.skills` нормализуется в `skillsJson` (массив строк → `Prisma.InputJsonValue`).
  - Вызывается `this.prisma.specialistProfile.upsert({ where: { profileId }, create: { ..., skills: skillsJson }, update: { ..., skills: skillsJson } })`.
  - Таблица: `specialist_profiles`, поле `skills` типа `Json?` (см. schema.prisma).

**2. GET `/me` — отдача профилей с категорией**

- **Контроллер:** `api/src/me/me.controller.ts` (строки ~10–66):
  - Запрос: `this.prisma.user.findUnique({ where: { id: userId }, include: { profiles: { include: { specialistProfile: true } } } })`.
  - Для каждого профиля с `type === "specialist"` и наличием `specialistProfile`:
    - Берётся `p.specialistProfile.skills` (то, что вернула Prisma из колонки `skills`).
    - Если это строка — делается `JSON.parse(raw)`.
    - Из результата собирается массив строк `skillsArr` (поддержка array / object).
    - В ответ добавляется `specialist: { skills: skillsArr, pricePerHour, about }`.

**3. Схема БД**

- **Файл:** `api/prisma/schema.prisma`
- **Профиль:** модель `Profile` (id, userId, type, ...), у неё опциональная связь `specialistProfile  SpecialistProfile?`.
- **Профиль специалиста:** модель `SpecialistProfile` (profileId, **skills Json?**, pricePerHour, about, ...), таблица `specialist_profiles`.

То есть категория хранится в `specialist_profiles.skills` в формате JSON (ожидается массив строк, например `["Досуг"]`).

---

## Возможные причины бага

1. **Бэкенд не записывает**  
   Проверить: в `profiles.service.ts` в `updateSpecialist` действительно ли в `upsert` в `update` передаётся `skills: skillsJson` с массивом `["Досуг"]`. Возможны особенности Prisma для поля `Json` (тип, сериализация).

2. **Бэкенд записывает, но GET /me отдаёт пустое или другое**  
   Проверить: после PATCH сделать GET `/me` и посмотреть, что в `profiles[].specialist.skills` для нужного профиля. Если там `[]` или нет `specialist`, то на фронте после `refreshMe()` в эффекте будет `setSpecialistCategory("")` и в селекте отобразится «Няня».

3. **Фронт перезаписывает после ответа PATCH**  
   Сначала из ответа PATCH вызывается `setSpecialistCategory(specRes.skills[0])` — тогда бы «Досуг» оставался. Но сразу после этого вызывается `refreshMe()`, приходит новый `me`, пересчитывается `activeProfile`, срабатывает эффект и вызывается `setSpecialistCategory(activeProfile.specialist.skills[0])`. Если в этом объекте `skills` пустой — снова ставится `""` и показывается «Няня». Итог: важно, что именно возвращает GET `/me` для этого профиля после сохранения.

4. **Формат в БД**  
   Prisma/PostgreSQL для `Json`: при чтении может вернуть массив, объект или строку. В `me.controller.ts` уже есть разбор строки через `JSON.parse` и обработка массива/объекта — стоит убедиться, что под текущий формат хранения в БД этот разбор всегда даёт массив строк с одним элементом `"Досуг"`.

---

## Что проверить по шагам

1. В браузере (Network): при нажатии «Сохранить» запрос PATCH `/profiles/.../specialist` — в Request payload должно быть `skills: ["Досуг"]`.
2. В ответе того же PATCH — в Response body должно быть `skills: ["Досуг"]` (или хотя бы не пустой массив).
3. Сразу после этого уходит GET `/me`. В ответе GET `/me` для профиля с этим `id` в `profiles[].specialist.skills` должно быть `["Досуг"]`.
4. На фронте после `setMe(data)` объект `me.profiles.find(p => p.id === activeProfileId)` должен содержать `specialist.skills = ["Досуг"]`, тогда эффект выставит `specialistCategory = "Досуг"` и в селекте останется «Досуг».

Если на шаге 2 или 3 данные приходят пустыми или не те — ошибка на бэкенде (запись или чтение `skills`). Если на шаге 3 приходят `["Досуг"]`, а в интерфейсе всё равно «Няня» — смотреть порядок эффектов и то, не перезаписывает ли что-то `specialistCategory` после `setMe`.
