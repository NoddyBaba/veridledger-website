import { supabase } from "@/lib/supabase";

export type ActivityAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'PROFILE_UPDATED'
  | 'BIO_UPDATED'
  | 'AVATAR_UPDATED'
  | 'PICK_LOCKED'
  | 'SUBSCRIPTION_STARTED'
  | 'SUBSCRIPTION_CANCELLED';

export async function logActivity(userId: string, actionType: ActivityAction, metadata?: Record<string, any>) {
  try {
    const { error } = await supabase!
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        metadata: metadata || {}
      });

    if (error) {
      console.error("Failed to log activity:", error.message);
    }
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
