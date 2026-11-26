<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AIComplaintService;
use Illuminate\Http\Request;
use Throwable;

class AIComplaintController extends Controller
{
    public function chat(Request $request, AIComplaintService $aiService)
    {
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:60'],

            'messages.*.role' => [
                'required',
                'string',
                'in:user,assistant',
            ],

            'messages.*.text' => [
                'required',
                'string',
                'max:2000',
            ],
        ]);

        $maxCharacters = (int) config('services.groq.max_conversation_characters', 20000);
        $totalCharacters = collect($validated['messages'])
            ->sum(fn (array $message) => mb_strlen($message['text']));

        if ($totalCharacters > $maxCharacters) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'messages' => "The conversation may contain no more than {$maxCharacters} characters in total.",
            ]);
        }

        try {
            $result = $aiService->chat($validated['messages']);

            return response()->json($result);

        } catch (\App\Exceptions\AIComplaintServiceException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], $e->httpStatus());
        } catch (Throwable $e) {
            logger()->error('AI Complaint Assistant failed unexpectedly.', [
                'exception' => class_basename($e),
            ]);

            return response()->json([
                'message' => 'The AI assistant is temporarily unavailable. Please try again.',
            ], 503);
        }
    }
}
