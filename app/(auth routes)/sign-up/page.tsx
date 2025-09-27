'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAxiosError, type AxiosError } from 'axios';
import { register } from '@/lib/api/clientApi';
import { useAuthStore, type AuthState } from '@/lib/store/authStore';
import type { AuthCredentials } from '@/types/user';
import css from './page.module.css';

const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

const SignUpPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state: AuthState) => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = ((formData.get('email') ?? '') as string).trim();
    const password = (formData.get('password') as string) ?? '';

    if (!email || !password) {
      setError('Заповніть, будь ласка, email і пароль.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Невірний формат email.');
      return;
    }

    if (password.length < 6) {
      setError('Пароль має містити щонайменше 6 символів.');
      return;
    }

    const payload: AuthCredentials = { email, password };

    try {
      setIsSubmitting(true);
      const user = await register(payload);
      setUser(user);

      const redirectTarget = searchParams?.get('redirect');
      const destination =
        redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/notes/filter/All';
      router.replace(destination);
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; error?: string }>;
        const responseData = axiosError.response?.data;
        if (axiosError.response?.status === 400) {
          setError('Такий акаунт вже існує або дані некоректні. Перевірте їх, будь ласка.');
          return;
        }
        const message =
          responseData?.message ||
          responseData?.error ||
          axiosError.message ||
          'Не вдалося завершити реєстрацію. Спробуйте знову.';
        setError(message);
      } else {
        setError('Не вдалося завершити реєстрацію. Спробуйте знову.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={css.mainContent}>
      <form className={css.form} onSubmit={handleSubmit} noValidate>
        <h1 className={css.formTitle}>Sign up</h1>
        <div className={css.formGroup}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" className={css.input} required />
        </div>

        <div className={css.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            className={css.input}
            required
          />
        </div>

        {error && <p className={css.error}>{error}</p>}

        <div className={css.actions}>
          <button type="submit" className={css.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Реєструємо...' : 'Зареєструватися'}
          </button>
        </div>
      </form>
    </main>
  );
};

export default SignUpPage;
