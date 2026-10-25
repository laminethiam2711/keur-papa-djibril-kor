import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/**
 * Contrôle l'accès à l'espace de gestion.
 * - Administrateur : accès à tout.
 * - Enseignant : seulement les pages marquées `data: { enseignant: true }`, et seulement pour SES classes.
 * - Sinon : page de connexion.
 */
export const adminGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const sb = inject(SupabaseService);
  const router = inject(Router);
  const role = await sb.role();
  if (role === 'admin') return true;
  if (role === 'enseignant') {
    // la page parente (menu) est accessible ; le contrôle se fait sur chaque page
    if (route.routeConfig?.path === 'admin') return true;
    if (!route.data['enseignant']) return router.parseUrl('/admin/mes-classes');
    const classe = route.params['classe'] ?? route.params['id'];
    if (classe !== undefined && !sb.classesEnseignant().includes(Number(classe))) return router.parseUrl('/admin/mes-classes');
    return true;
  }
  return router.parseUrl('/admin/connexion');
};
