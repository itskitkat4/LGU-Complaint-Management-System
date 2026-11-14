<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Profile;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active) {
            return response()->json([
                'message' => 'Profile NOT Found',
            ], 404);
        }

        $notifications = Notification::query()
            ->where('profile_id', $profile->id)
            ->with('complaint:id,title,status')
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'message' => 'Notifications retrieved Successfully',
            'data' => $notifications,
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active) {
            return response()->json([
                'message' => 'Active profile not found.',
            ], 403);
        }

        $count = Notification::query()
            ->where('profile_id', $profile->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'message' => 'Unread Notification retrieved Successfully',
            'unread_count' => $count
        ]);
    }

    public function markAsRead(Request $request, string $notificationId)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active) {
            return response()->json([
                'message' => 'Active profile not found.',
            ], 403);
        }

        $notification = Notification::query()
            ->where('id', $notificationId)
            ->where('profile_id', $profile->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'message' => 'Notification not found.',
            ], 404);
        }

        if (!$notification->is_read) {
            $notification->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'data' => $notification,
        ]);
    }
    public function markAllAsRead(Request $request)
    {
        $user = $request->attributes->get('supabase_user');

        if (!$user || empty($user['id'])) {
            return response()->json([
                'message' => 'Authentication is required.',
            ], 401);
        }

        $profile = Profile::find($user['id']);

        if (!$profile || !$profile->is_active) {
            return response()->json([
                'message' => 'Active profile not found.',
            ], 403);
        }

        Notification::query()
            ->where('profile_id', $profile->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'All Notifications marked as read'
        ]);
    }
}
