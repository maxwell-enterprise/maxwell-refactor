# Struktur Project MaxwellV3

> Ringkasan struktur project (tanpa `.next`, `node_modules`, `.git`) + catatan fungsi singkat.

## Tree + Catatan

```text
maxwellv3/
├── ARCHITECTURE.md                     # dokumen arsitektur high-level
├── README.md                           # panduan project
├── package.json                        # script + dependencies
├── next.config.ts                      # konfigurasi Next.js
├── tsconfig.json                       # konfigurasi TypeScript
├── eslint.config.mjs                   # aturan lint
├── postcss.config.mjs                  # pipeline CSS
├── public/                             # aset statis
│   ├── *.svg                           # ikon/logo default
├── src/                                # source code utama aplikasi
│   ├── app/                            # App Router (entry route + layout)
│   │   ├── layout.tsx                  # root layout + provider mounting
│   │   ├── page.tsx                    # landing/root route
│   │   └── dashboard/                  # route dashboard
│   ├── components/                     # UI layer terbesar (screen + domain UI)
│   │   ├── *.tsx                       # screen/container level (CRM, Finance, Store, dst)
│   │   ├── admin/                      # admin tools (schema, automation, config)
│   │   ├── attendance/                 # alur attendance/gate/scanner
│   │   ├── auth/                       # login + persona switching
│   │   ├── common/                     # shared UI util + compatibility shims
│   │   ├── atoms/                      # atomic kecil reusable (contoh: StatusBadge)
│   │   ├── molecules/                  # komposisi kecil reusable (contoh: StatCard)
│   │   ├── organisms/                  # komposisi lebih besar reusable (contoh: GlobalDialog)
│   │   ├── crm/                        # modal/panel khusus CRM
│   │   ├── communication/              # email/WA/PDF editor
│   │   ├── events/                     # event catalog + invitation UI
│   │   ├── finance/                    # payout, refund, ledger, transaksi
│   │   ├── operations/                 # workflow + contract tooling
│   │   ├── ops/                        # action/task/event operational widgets
│   │   ├── store/                      # storefront + inventory + pricing
│   │   ├── wallet/                     # distribusi tiket + riwayat wallet
│   │   └── ...                         # domain lain: security, mentoring, tribe, system, dll
│   ├── constants/                      # registry/defs/config statis domain
│   ├── context/                        # React context aktif (auth/dialog/security/toast)
│   ├── core/                           # layer core/compat (context/ui/types bridge)
│   ├── hooks/                          # custom hook reusable
│   ├── layouts/                        # layout komposisi dashboard
│   ├── lib/                            # config/supabase client
│   ├── modules/                        # modularized feature area (contoh finance module)
│   ├── scopes/                         # scope boundary dashboard (page/providers/logic)
│   ├── seeds/                          # data seed/testing scenarios local-first
│   ├── services/                       # business/service layer + repositories
│   ├── types/                          # type definitions domain
│   ├── utils/                          # helper util umum
│   ├── App.tsx                         # orchestrator view-state utama dashboard
│   └── index.css                       # style global tambahan
├── DENAH_FOLDER_*.txt                  # file denah hasil generate
└── DENAH_TREE_*.txt                    # file tree hasil generate
```

## Total Line Code

Perhitungan dari file `*.ts, *.tsx, *.js, *.jsx, *.css` di dalam `src`:

- Total line kode `src`: **49,931** lines

### Breakdown per Folder `src`

- `components`: **31,038**
- `services`: **9,077**
- `seeds`: **2,980**
- `constants`: **2,252**
- `types`: **1,824**
- `core`: **903**
- `context`: **444**
- `utils`: **317**
- `modules`: **319**
- `layouts`: **256**
- `hooks`: **176**
- `app`: **73**
- `lib`: **60**
- `scopes`: **42**

## Catatan Cepat

- Folder paling besar ada di `src/components` dan `src/services`.
- `src/components` berisi campuran screen-level container + domain UI reusable.
- `src/services` menampung logika bisnis dan akses data/repository (mock + supabase).
- `src/seeds` dipakai untuk skenario data local-first/testing.

