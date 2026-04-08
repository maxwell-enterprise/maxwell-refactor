# Action Center Testing Guide

Dokumen ini menjelaskan cara test UI `Action Center` pada branch `FE-Fiqi_refactor_master` di repo `Front/maxwell-refactor`.

## Scope

Yang sudah bisa dites end-to-end ke BE external:
- fetch daftar task OPS di `My Action Center`
- buka detail task OPS
- update status task OPS
- refresh daftar task setelah perubahan

Yang belum fully external:
- support tickets di `Action Center`
- resolve support ticket dari `Action Center`

## Preconditions

Pastikan environment aktif:

```env
NEXT_PUBLIC_EXTERNAL_API_ONLY=true
NEXT_PUBLIC_OPS_BACKEND=API
NEXT_PUBLIC_API_BASE_URL=https://server-maxwell-production.up.railway.app/fe
```

Jika testing di local backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/fe
```

Lalu jalankan FE:

```powershell
cd D:\PROJECT\KERJAAN\Maxwell Project\Front\maxwell-refactor
npm run dev
```

## Files Involved

UI dan logic utama:
- [MyTasks.tsx](/D:/PROJECT/KERJAAN/Maxwell%20Project/Front/maxwell-refactor/src/components/MyTasks.tsx)
- [taskService.ts](/D:/PROJECT/KERJAAN/Maxwell%20Project/Front/maxwell-refactor/src/services/taskService.ts)
- [opsService.ts](/D:/PROJECT/KERJAAN/Maxwell%20Project/Front/maxwell-refactor/src/services/opsService.ts)
- [apiWorkflowRepository.ts](/D:/PROJECT/KERJAAN/Maxwell%20Project/Front/maxwell-refactor/src/repositories/api/apiWorkflowRepository.ts)

BE endpoints yang dipakai:
- `GET /store/ops-checklists`
- `GET /store/ops-checklists/lookup/:id`
- `PUT /store/ops-checklists/:id`

## Test Case 1: Open Action Center

1. Login ke dashboard.
2. Buka menu `Action Center`.
3. Pastikan page `My Action Center` tampil.
4. Tunggu loading selesai.

Expected:
- daftar task muncul jika backend punya checklist aktif
- jika tidak ada task, tampil state `Zero Pending Tasks`
- tidak ada error `External API Only`

Network yang diharapkan:
- `GET /fe/store/ops-checklists`

## Test Case 2: Refresh List

1. Di halaman `Action Center`, klik tombol refresh.

Expected:
- icon refresh berputar saat loading
- list task dimuat ulang dari backend
- tidak ada fallback ke mock data

Network yang diharapkan:
- `GET /fe/store/ops-checklists`

## Test Case 3: Open OPS Task Detail

1. Klik salah satu card task dengan source `OPS`.

Expected:
- modal task action terbuka
- task detail sesuai checklist backend

Network yang diharapkan:
- `GET /fe/store/ops-checklists/lookup/:id`

Catatan:
- task hanya muncul kalau `assignedRole` task cocok dengan role user yang login
- task dengan status `COMPLETED` atau `SKIPPED` tidak muncul di list

## Test Case 4: Update Task Status

1. Buka salah satu task OPS.
2. Ubah status ke `IN_PROGRESS` atau `COMPLETED`.
3. Isi note jika diminta modal.
4. Submit update.

Expected:
- muncul toast sukses
- modal menutup
- list task reload
- progress checklist berubah di backend

Network yang diharapkan:
- `GET /fe/store/ops-checklists/lookup/:id`
- `PUT /fe/store/ops-checklists/:id`
- `GET /fe/store/ops-checklists`

## Test Case 5: Verify Completed Task Disappears

1. Ambil task OPS yang masih `PENDING`.
2. Ubah status menjadi `COMPLETED`.
3. Kembali ke list `Action Center`.

Expected:
- task tersebut tidak muncul lagi untuk user yang sama
- ini normal karena filter FE hanya menampilkan task non-final

## Test Case 6: Search Filtering

1. Ketik keyword pada search box.
2. Coba cari berdasarkan judul task.
3. Coba cari berdasarkan nama member.

Expected:
- card task terfilter secara client-side
- search tidak memicu request backend baru

## Data Requirements

Agar task muncul di UI, checklist backend harus memenuhi syarat berikut:
- checklist `status` bukan `COMPLETED`
- di dalam `tasks`, ada minimal satu task:
  - `assignedRole` sama dengan role user login
  - `status` bukan `COMPLETED`
  - `status` bukan `SKIPPED`

Contoh task yang akan tampil:

```json
{
  "id": "TSK-001",
  "title": "Confirm Payment",
  "description": "Validate incoming transfer",
  "status": "PENDING",
  "assignedRole": "Operations",
  "type": "MANUAL",
  "scope": "USER_LEVEL",
  "initiatedAt": "2026-04-07T08:00:00.000Z",
  "logs": []
}
```

## Known Limitations

1. `Action Center` source `OPS` sudah external, tetapi source `SUPPORT` belum punya endpoint BE.
2. `resolve support ticket` di `MyTasks` masih simulasi UI-only.
3. Modal support ticket di CRM belum tersambung ke save handler aktif.

## Troubleshooting

Jika task kosong padahal backend ada data:

1. cek role user login
2. cek `assignedRole` di task backend
3. cek status checklist dan status task
4. cek response `GET /fe/store/ops-checklists` di browser network
5. pastikan dev server sudah restart setelah perubahan env

Jika muncul error API:

1. cek `NEXT_PUBLIC_API_BASE_URL`
2. cek backend path `/fe/store/ops-checklists`
3. cek apakah response backend mengandung `tasks` array yang valid

## Recommended Smoke Test

Urutan test paling efisien:

1. buka `Action Center`
2. pastikan `GET /store/ops-checklists` sukses
3. klik satu task OPS
4. pastikan `GET /store/ops-checklists/lookup/:id` sukses
5. ubah status task
6. pastikan `PUT /store/ops-checklists/:id` sukses
7. refresh page dan pastikan state terbaru tetap konsisten

## Next Step

Setelah contract support ticket BE siap, lanjutkan:

1. finalkan path di `apiSupportTicketRepository.ts`
2. tambahkan `NEXT_PUBLIC_SUPPORT_BACKEND=API`
3. sambungkan UI create/resolve ticket ke `SupportService`
