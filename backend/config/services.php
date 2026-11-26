<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'publishable_key' => env('SUPABASE_PUBLISHABLE_KEY'),
        'secret_key' => env('SUPABASE_SECRET_KEY'),
        // Require an explicit public frontend URL for emailed invitation links.
        'frontend_url' => env('FRONTEND_URL'),
        'storage_bucket' => env(
            'SUPABASE_STORAGE_BUCKET',
            'complaint-attachments'
        ),

        'reports_storage_bucket' => env(
            'SUPABASE_REPORTS_STORAGE_BUCKET',
            'reports'
        ),
    ],

    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'openai/gpt-oss-20b'),
        'base_url' => 'https://api.groq.com/openai/v1',
        // 20,000 Unicode characters caps total conversation input size while
        // retaining room for detailed complaint histories.
        'max_conversation_characters' => env('GROQ_MAX_CONVERSATION_CHARACTERS', 20000),
    ],


    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
