<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ComplaintCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Road and Infrastructure',
                'description' => 'Damaged roads, potholes, broken sidewalks, and infrastructure issues.',
            ],
            [
                'name' => 'Drainage and Flooding',
                'description' => 'Clogged canals, poor drainage systems, and flooding concerns.',
            ],
            [
                'name' => 'Waste Management',
                'description' => 'Missed garbage collection, improper waste disposal, and accumulated garbage.',
            ],
            [
                'name' => 'Public Sanitation',
                'description' => 'Unsanitary surroundings, public toilets, and sanitation concerns.',
            ],
            [
                'name' => 'Noise Disturbance',
                'description' => 'Excessive noise, loud music, and disruptive community activities.',
            ],
            [
                'name' => 'Public Safety',
                'description' => 'Unsafe public areas, hazards, and community safety concerns.',
            ],
            [
                'name' => 'Traffic and Parking',
                'description' => 'Traffic congestion, illegal parking, and road obstructions.',
            ],
            [
                'name' => 'Street Lighting',
                'description' => 'Broken streetlights and poorly illuminated public areas.',
            ],
            [
                'name' => 'Water Supply',
                'description' => 'Water interruptions, leaks, and water supply concerns.',
            ],
            [
                'name' => 'Animal-Related Concerns',
                'description' => 'Stray animals, animal control, and animal-related disturbances.',
            ],
            [
                'name' => 'Health and Medical Services',
                'description' => 'Public health concerns and complaints about health services.',
            ],
            [
                'name' => 'Social Welfare Assistance',
                'description' => 'Concerns involving social assistance and welfare programs.',
            ],
            [
                'name' => 'Business Establishments',
                'description' => 'Business-related complaints and permit concerns.',
            ],
            [
                'name' => 'Environmental Concerns',
                'description' => 'Pollution, illegal dumping, and environmental violations.',
            ],
            [
                'name' => 'Other Concerns',
                'description' => 'Complaints that do not fall under the available categories.',
            ],
        ];

        foreach ($categories as $category) {
            $existing = DB::table('complaint_categories')
                ->where('name', $category['name'])
                ->first();

            if ($existing) {
                DB::table('complaint_categories')
                    ->where('id', $existing->id)
                    ->update([
                        'description' => $category['description'],
                    ]);
            } else {
                DB::table('complaint_categories')->insert([
                    'id' => (string) Str::uuid(),
                    'name' => $category['name'],
                    'description' => $category['description'],
                ]);
            }
        }
    }
}
