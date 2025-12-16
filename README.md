# Devlog Web App

Devlog Web App adalah frontend aplikasi **Devlog**, sebuah personal project & daily worklog management system yang dirancang khusus untuk developer dalam mencatat aktivitas kerja harian secara terstruktur dan konsisten.

Aplikasi ini berfokus pada **clarity, speed, dan usability**, sehingga cocok digunakan sebagai daily tool maupun sebagai showcase project untuk kebutuhan rekrutmen.

---

## 🚀 Tech Stack

- **TypeScript**
- **React / Next.js** (App Router)
- **Tailwind CSS**
- **REST API**
- **JWT Authentication**

---

## 🎯 Core Principles

- Simple & focused UI
- Low friction daily logging
- Clear separation between USER & ADMIN
- Consistent state & error handling
- Read-only mode for archived data

---

## 🧭 Application Flow

1. User login / register
2. JWT token diterima dari backend
3. Fetch `/auth/me` untuk menentukan role
4. Redirect:
   - `USER` → Dashboard
   - `ADMIN` → Admin Dashboard
5. User mengelola project & worklog harian

---

## 📄 Pages Overview

### Public Pages
- `/login` — Login
- `/register` — Register

---

### User Pages
- `/dashboard` — Ringkasan aktivitas
- `/projects` — Daftar project
- `/projects/new` — Create project
- `/projects/:id` — Project detail
- `/projects/:id/edit` — Edit project
- `/projects/:id/worklogs` — Worklogs list
- `/projects/:id/worklogs/new` — Add worklog
- `/projects/:id/worklogs/:worklogId` — Worklog detail
- `/projects/:id/worklogs/:worklogId/edit` — Edit worklog
- `/profile` — User profile

---

### Admin Pages
- `/admin` — Admin dashboard
- `/admin/users` — User management
- `/admin/users/:id` — User detail
- `/admin/projects` — Project moderation
- `/admin/projects/:id` — Project detail (read-only)
- `/admin/audit-logs` — Audit logs

---

## 🔐 Authentication & Authorization

- Authentication menggunakan **JWT**
- Token dikirim via header:

```http
Authorization: Bearer <access_token>
```

Role-based access control:

- USER
- ADMIN

Frontend route guard memastikan:
- User tidak bisa mengakses halaman admin
- Admin tidak mengakses halaman user

---

## 🗂️ Project Structure

Struktur utama (ringkas):

```
app/
  (dashboard)/
    projects/
      [projectId]/
        worklogs/
          [worklogId]/
          add/
          edit/
        edit/
      add/
components/
  ui/
hooks/
lib/
```

---

## 🌐 API Integration

Frontend terintegrasi penuh dengan Devlog API.

Contoh request (TypeScript, create project):

```ts
const API_HOST = process.env.NEXT_PUBLIC_API_HOST as string

async function createProject(token: string, payload: {
  title: string
  description?: string
  techStack?: string
  status?: "ACTIVE" | "ARCHIVED"
}) {
  const res = await fetch(`${API_HOST}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      techStack: payload.techStack,
      status: payload.status ?? "ACTIVE",
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || `Failed (${res.status})`)
  }
  return res.json()
}
```

---

## ⚙️ Environment Variables

Buat file `.env` di root project:

```env
NEXT_PUBLIC_API_HOST=http://localhost:3000
```

---

## ▶️ Running the Project

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

---

## 🧪 UX & Quality Considerations

- Skeleton loading
- Empty states
- Confirmation modal untuk aksi destruktif
- Inline form validation
- Read-only mode untuk archived project
- Date immutability pada worklog

---

## 📌 Notes

- Frontend ini dirancang untuk bekerja dengan Supabase PostgreSQL backend
- Tidak ada state sensitif yang disimpan secara tidak aman
- Semua role & permission ditentukan oleh backend
