# moharaz-web

Moharaz storefront (Next.js in `frontend/`). It reads the catalogue, blog, reviews and orders from the AgainERP API (`againerp-moharaz`).

```bash
cd frontend
npm install
npm run dev -- -p 3100
```

`frontend/.env.local`: `API_PROXY_TARGET` (the AgainERP API) and `NEXT_PUBLIC_ADMIN_ORIGIN` (the admin that embeds the shop).
