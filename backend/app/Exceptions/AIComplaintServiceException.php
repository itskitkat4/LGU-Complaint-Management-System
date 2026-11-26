<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class AIComplaintServiceException extends RuntimeException
{
    public function __construct(
        string $message,
        private readonly int $httpStatus = 503,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function httpStatus(): int
    {
        return $this->httpStatus;
    }
}
