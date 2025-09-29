This is a [Next.js](https://nextjs.org) project bootstrapped with
[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

You can start editing the page by modifying `app/page.tsx`. The page
auto-updates as you edit the file.

This project uses
[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
to automatically optimize and load [Geist](https://vercel.com/font), a new font
family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out
[the Next.js GitHub repository](https://github.com/vercel/next.js) - your
feedback and contributions are welcome!

## Deploy on Vercel

Before deploying, add the following environment variables in your Vercel project
settings:

| Variable              | Example value                                   | Purpose                                                                                                                      |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app`               | Допомагає коректно формувати редіректи та відлагоджувати URL                                                                 |
| `NEXT_PUBLIC_API_URL` | `https://notehub-api.goit.study`                | Базовий URL бекенда (без `/api` в кінці)                                                                                     |
| `AUTH_COOKIE_DOMAIN`  | `your-project.vercel.app` або `.yourdomain.com` | (Необов'язково) Явно задає домен для `accessToken`/`refreshToken`. Задавайте, лише якщо потрібно шарити куки між субдоменами |

> **Порада:** якщо у вас кастомний домен, використовуйте `.yourdomain.com`, щоб
> авторизаційні cookies працювали як на проді, так і на прев’ю-деплоях.

Після оновлення змінних обов’язково перезапустіть деплой. У продакшені
переконайтесь, що після логіну `accessToken` і `refreshToken` присутні в
Application → Cookies.

Більше деталей у
[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
