import { api } from './client';
import type { PlanDto } from '@/types';

export function listPlans(): Promise<PlanDto[]> {
  return api.get('plans').json<PlanDto[]>();
}

export function getPlan(id: number): Promise<PlanDto> {
  return api.get(`plans/${id}`).json<PlanDto>();
}
