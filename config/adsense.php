<?php

return [
    'enabled' => (bool) env('ADSENSE_ENABLED', false),

    'client_id' => env('ADSENSE_CLIENT_ID'),

    'test_mode' => (bool) env('ADSENSE_TEST_MODE', false),

    'slots' => [
        'home' => env('ADSENSE_SLOT_HOME'),
        'library' => env('ADSENSE_SLOT_LIBRARY'),
        'detail' => env('ADSENSE_SLOT_DETAIL'),
    ],
];
