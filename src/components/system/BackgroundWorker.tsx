
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/index';
import { AutomationQueueService } from '../../services/automationQueueService';

/**
 * CLIENT-SIDE BACKGROUND WORKER
 * 
 * This component has no UI. It mounts with the App and checks for pending
 * automation tasks periodically. It allows the Admin's browser to act as
 * the "Server Worker" to process queues (send emails, trigger WA, etc).
 */
const BackgroundWorker: React.FC = () => {
    const { userRole } = useAuth();
    const isProcessingRef = useRef(false);

    // List of roles allowed to process the queue (Security: don't let Guests process system tasks)
    const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE];

    useEffect(() => {
        // If user doesn't have permission, do nothing.
        if (!ALLOWED_ROLES.includes(userRole)) return;

        console.log(`[WORKER] Background Automation Worker initialized for ${userRole}`);

        const processQueue = async () => {
            if (isProcessingRef.current) return; // Prevent overlapping runs
            
            try {
                isProcessingRef.current = true;
                
                // Try to process one task
                const processed = await AutomationQueueService.processNextBackgroundTask();
                
                if (processed) {
                    console.log('[WORKER] Successfully processed a background task.');
                    // If we found work, check again sooner (burst mode)
                    setTimeout(() => {
                        isProcessingRef.current = false;
                        processQueue(); 
                    }, 2000); 
                } else {
                    isProcessingRef.current = false;
                }
            } catch (error) {
                // Unexpected only — queue fetch/lock failures are handled in AutomationQueueService
                console.warn('[WORKER] Queue tick failed', error);
                isProcessingRef.current = false;
            }
        };

        // Heartbeat: Check every 15 seconds
        const intervalId = setInterval(processQueue, 15000);
        
        // Initial check after mount (delayed slightly to let app load)
        const initialTimeout = setTimeout(processQueue, 5000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(initialTimeout);
        };
    }, [userRole]);

    return null; // Renderless component
};

export default BackgroundWorker;
