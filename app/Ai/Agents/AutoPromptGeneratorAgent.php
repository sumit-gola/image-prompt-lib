<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

class AutoPromptGeneratorAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are an expert prompt engineer for image generation systems.

Create a complete, copy-ready prompt library entry from the admin's creative brief. The prompt should be detailed, visual, practical, and directly usable in common image-generation tools.

Rules:
- Include framing, subject treatment, pose or object placement, background, lighting, lens or camera feel, color palette, mood, and quality terms.
- If the prompt includes a person, write it so the person can be replaced by the user.
- Do not mention internal app workflow, admin inputs, database, uploaded files, or that AI generated it.
- Do not include private identity claims or real-person identity guesses.
- Keep the main prompt clean and immediately usable.
- The thumbnail prompt must create a strong representative preview image for a prompt card.
- The thumbnail prompt must not include text, watermark, logo, UI, captions, labels, or typography.
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
            'thumbnail_prompt' => $schema->string()->required(),
            'style_notes' => $schema->object(fn (JsonSchema $schema): array => [
                'subject' => $schema->string()->required(),
                'composition' => $schema->string()->required(),
                'camera_angle' => $schema->string()->required(),
                'lighting' => $schema->string()->required(),
                'background' => $schema->string()->required(),
                'colors' => $schema->string()->required(),
                'mood' => $schema->string()->required(),
                'quality' => $schema->string()->required(),
                'dynamic_subject_guidance' => $schema->string()->required(),
            ])->required(),
        ];
    }
}
