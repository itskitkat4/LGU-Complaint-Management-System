<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedactAnonymousComplaintIdentity
{
    public function handle(Request $request, Closure $next): Response
    {
        $profile = $request->attributes->get('profile');
        $response = $next($request);

        if (
            !($response instanceof JsonResponse)
            || !$profile
            || in_array($profile->role, ['citizen', 'System Administrator'], true)
        ) {
            return $response;
        }

        $payload = $response->getData(true);
        $response->setData($this->redact($payload));

        return $response;
    }

    private function redact(mixed $value, bool $insideAnonymousComplaint = false): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $insideAnonymousComplaint = $insideAnonymousComplaint
            || (($value['is_anonymous'] ?? false) === true
            || ($value['is_anonymous'] ?? null) === 1);

        if ($insideAnonymousComplaint) {
            unset(
                $value['citizen_id'],
                $value['citizen'],
                $value['citizen_profile'],
                $value['citizen_profile_id'],
                $value['citizen_name'],
                $value['citizen_full_name'],
                $value['citizen_email'],
                $value['citizen_phone'],
                $value['citizen_contact_number'],
                $value['citizen_address'],
                $value['complainant'],
                $value['complainant_id'],
                $value['complainant_profile'],
                $value['complainant_profile_id'],
                $value['complainant_name'],
                $value['complainant_full_name'],
                $value['complainant_email'],
                $value['complainant_phone'],
                $value['complainant_contact_number'],
                $value['complainant_address'],
                $value['profile'],
                $value['profile_id']
            );
        }

        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->redact($item, $insideAnonymousComplaint);
            }
        }

        if ($insideAnonymousComplaint && array_key_exists('file_name', $value)) {
            $value['file_name'] = 'Anonymous evidence';
            unset($value['uploaded_by']);
        }

        return $value;
    }
}
