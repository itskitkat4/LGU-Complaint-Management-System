<?php

namespace Database\Seeders;

use App\Models\Barangay;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BarangaySeeder extends Seeder
{
    /**
     * Seed the barangays of Tagoloan, Misamis Oriental.
     */
    public function run(): void
    {
        $barangays = [
            ['Baluarte', '1004324001'],
            ['Casinglot', '1004324002'],
            ['Gracia', '1004324003'],
            ['Mohon', '1004324004'],
            ['Natumolan', '1004324005'],
            ['Poblacion', '1004324006'],
            ['Rosario', '1004324007'],
            ['Santa Ana', '1004324008'],
            ['Santa Cruz', '1004324009'],
            ['Sugbongcogon', '1004324010'],
        ];

        foreach ($barangays as [$name, $code]) {
            Barangay::firstOrCreate(
                ['name' => $name],
                ['id' => (string) Str::uuid(), 'code' => $code],
            );
        }
    }
}
