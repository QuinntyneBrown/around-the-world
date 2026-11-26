/**
 * The classmates' agents, in a chunk of their own that loads when a solo tour starts
 * (docs/adr/0019). Solo Or Friends fetches it ahead, so a solo game still plays once the
 * device has lost its network (docs/adr/0031-making-a-room.md).
 */
export const loadClassmateAgent = () => import('./classmate-agent');
