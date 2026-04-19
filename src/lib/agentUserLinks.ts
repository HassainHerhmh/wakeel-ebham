import type { AuthUser, RestaurantItem, StaffUser } from '../types';

export function attachAgentLinkToUser<T extends AuthUser | StaffUser>(user: T): T {
  return user;
}

export function getEffectiveAgentId(user?: AuthUser | null): string | null {
  if (!user) {
    return null;
  }

  if (user.role === 'agent') {
    return user.id;
  }

  return user.linked_agent_id || null;
}

export function getEffectiveAgentName(user?: AuthUser | null): string | null {
  if (!user) {
    return null;
  }

  if (user.role === 'agent') {
    return user.name;
  }

  return user.linked_agent_name || null;
}

export function filterUsersByAgent(users: StaffUser[], agentId?: string | null) {
  if (!agentId) {
    return [];
  }

  return users.filter((user) => String(user.linked_agent_id || '') === String(agentId));
}

export function filterRestaurantsByAgent(restaurants: RestaurantItem[], user?: AuthUser | null) {
  const effectiveAgentId = getEffectiveAgentId(user);

  if (!effectiveAgentId) {
    return restaurants;
  }

  return restaurants.filter((restaurant) => String(restaurant.agent_id || '') === String(effectiveAgentId));
}