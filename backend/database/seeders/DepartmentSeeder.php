<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            [
                'name' => 'Engineering',
                'description' => 'Handles infrastructure, roads, drainage, and related engineering concerns.',
            ],
            [
                'name' => 'Health',
                'description' => 'Handles public health, sanitation, health services, and related concerns.',
            ],
            [
                'name' => 'Social Welfare',
                'description' => 'Handles social assistance, community welfare, and concerns involving vulnerable individuals.',
            ],
            [
                'name' => 'Environment',
                'description' => 'Handles waste management, environmental protection, cleanliness, and pollution concerns.',
            ],
            [
                'name' => 'General Services',
                'description' => 'Handles maintenance of LGU facilities, public properties, equipment, and general services.',
            ],
            [
                'name' => 'Public Order and Safety',
                'description' => 'Handles public disturbances, community safety, and public order concerns.',
            ],
            [
                'name' => 'Disaster Risk Reduction and Management',
                'description' => 'Handles disaster preparedness, emergency response, flooding, and disaster-related concerns.',
            ],
            [
                'name' => 'Traffic Management',
                'description' => 'Handles traffic congestion, road obstructions, parking, and traffic-related concerns.',
            ],
            [
                'name' => 'Business Permits and Licensing',
                'description' => 'Handles business permit applications, licensing, and related complaints.',
            ],
            [
                'name' => 'Agriculture',
                'description' => 'Handles agricultural concerns, farming assistance, and agricultural community services.',
            ],
            [
                'name' => 'Housing and Urban Development',
                'description' => 'Handles housing concerns, urban development, and related community issues.',
            ],
        ];

        foreach ($departments as $department) {
            DB::table('departments')->updateOrInsert(
                ['name' => $department['name']],
                [
                    'id' => (string) Str::uuid(),
                    'description' => $department['description'],
                ]
            );
        }
    }
}
