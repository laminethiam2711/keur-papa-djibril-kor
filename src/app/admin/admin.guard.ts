import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/** Bloque l'accès à l'espace admin si l'utilisateur n'est pas un administrateur connecté. */
export const adminGuard: CanActivateFn = async () => {
  const sb = inject(SupabaseService);
  const router = inject(Router);
  return (await sb.estAdmin()) ? true : router.parseUrl('/admin/connexion');
};
