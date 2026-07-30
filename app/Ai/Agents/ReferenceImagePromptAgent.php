<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

class ReferenceImagePromptAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are an expert prompt engineer for image generation systems.

Analyze the attached reference image and write a clean, directly reusable image-generation prompt. The prompt must help another person recreate a similar image by describing visual style, framing, subject treatment, lighting, pose, background, colors, mood, and quality.

Rules:
- Do not mention that the prompt came from an uploaded image.
- Do not include private identity claims or real-person identity guesses.
- Keep the prompt usable as-is in common image generation tools.
- Prefer concrete visual details over vague words.
- If the image contains a person, describe the person generically as the subject rather than naming or identifying them.
- Return only the structured schema.
PROMPT;
    }

    /**
     * Get the agent's structured output schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->max(120)->required(),
            'prompt' => $schema->string()->required(),
            'negative_prompt' => $schema->string()->nullable(),
            'category' => $schema->string()->enum(['portrait', 'product', 'fashion', 'lifestyle', 'art', 'other'])->required(),
            'style_notes' => $schema->object(fn (JsonSchema $schema): array => [
                'subject' => $schema->string()->required(),
                'composition' => $schema->string()->required(),
                'camera_angle' => $schema->string()->required(),
                'lighting' => $schema->string()->required(),
                'background' => $schema->string()->required(),
                'colors' => $schema->string()->required(),
                'mood' => $schema->string()->required(),
                'quality' => $schema->string()->required(),
            ])->required(),
        ];
    }
}
