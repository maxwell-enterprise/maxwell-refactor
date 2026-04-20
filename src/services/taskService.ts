
import { OpsService } from './opsService';
import { SupportService } from './supportService';
import { UserRole } from '../types/index';
import { OpsChecklist } from '../types/ops';
import { workspaceFetch } from '../lib/workspaceApi';

export interface UnifiedTask {
    id: string;
    title: string;
    description: string;
    source: 'OPS' | 'SUPPORT' | 'SYSTEM';
    status: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate?: string;
    createdAt: string;
    assignedRole: UserRole;
    metadata?: {
        checklistId?: string;
        memberId?: string;
        memberName?: string;
        /** Prisma `InboxNotification.id` when `source === 'SYSTEM'`. */
        rbacInboxId?: string;
    };
}

/** Fired after task list is force-refreshed so shell (e.g. header bell) can resync without coupling components. */
export const MAXWELL_TASKS_UPDATED_EVENT = 'maxwell-tasks-updated';

/** Short TTL so tab-hopping does not refetch OPS+Support+RBAC every time; bell stays “fresh enough”. */
const MY_TASKS_CACHE_TTL_MS = 20_000;
let myTasksCache: { roleKey: string; at: number; data: UnifiedTask[] } | null = null;

/** RBAC rows are shaped on the server (`assignedRole` from DB, not from this argument). */
async function fetchRbacTasksFromApi(): Promise<UnifiedTask[]> {
    if (typeof window === 'undefined') return [];
    try {
        const res = await workspaceFetch('/me/rbac-tasks');
        if (!res.ok) return [];
        return (await res.json()) as UnifiedTask[];
    } catch {
        return [];
    }
}

export type GetMyTasksOptions = {
  /** Skip cache (e.g. manual refresh or after mutation). */
  bypassCache?: boolean;
};

export const TaskService = {
    /**
     * Aggregates tasks from multiple sources (Ops Checklists, Tickets)
     * Filters by the user's role.
     */
    getMyTasks: async (
        userRole: UserRole,
        opts?: GetMyTasksOptions,
    ): Promise<UnifiedTask[]> => {
        const roleKey = String(userRole);
        const now = Date.now();
        if (
            !opts?.bypassCache &&
            myTasksCache &&
            myTasksCache.roleKey === roleKey &&
            now - myTasksCache.at < MY_TASKS_CACHE_TTL_MS
        ) {
            return myTasksCache.data;
        }

        const rbacTasks = await fetchRbacTasksFromApi();
        const tasks: UnifiedTask[] = [];

        // 1. Fetch Ops Tasks
        let checklists: OpsChecklist[] = [];
        try {
            checklists = await OpsService.getChecklists();
        } catch (error) {
            console.warn('[TaskService] Failed to fetch OPS checklists:', error);
        }
        
        checklists.forEach(checklist => {
            if (checklist.status === 'COMPLETED') return; 

            checklist.tasks.forEach(task => {
                if (task.assignedRole === userRole && task.status !== 'COMPLETED' && task.status !== 'SKIPPED') {
                    tasks.push({
                        id: task.id,
                        title: task.title,
                        description: `${task.description} (Product: ${checklist.productName})`,
                        source: 'OPS',
                        status: task.status,
                        priority: 'MEDIUM',
                        createdAt: task.initiatedAt,
                        assignedRole: task.assignedRole,
                        metadata: {
                            checklistId: checklist.id,
                            memberId: checklist.memberId,
                            memberName: checklist.memberName
                        }
                    });
                }
            });
        });

        // 2. Fetch Support Tickets (VIA SERVICE)
        const allTickets = await SupportService.getTickets();
        const activeTickets = allTickets.filter(t => t.assignedRole === userRole && t.status !== 'RESOLVED');
        
        activeTickets.forEach(ticket => {
            tasks.push({
                id: ticket.id,
                title: `Ticket: ${ticket.subject}`,
                description: ticket.description,
                source: 'SUPPORT',
                status: ticket.status,
                priority: ticket.priority === 'URGENT' ? 'HIGH' : ticket.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
                createdAt: ticket.createdAt,
                assignedRole: ticket.assignedRole,
                metadata: {
                    memberId: ticket.memberId,
                    memberName: ticket.memberName
                }
            });
        });

        const merged = [...rbacTasks, ...tasks];
        const sorted = merged.sort((a, b) => {
            if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
            if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        myTasksCache = { roleKey, at: Date.now(), data: sorted };
        return sorted;
    },

    getPendingCount: async (userRole: UserRole): Promise<number> => {
        const tasks = await TaskService.getMyTasks(userRole);
        return tasks.length;
    },
};