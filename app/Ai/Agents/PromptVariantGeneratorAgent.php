<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

class PromptVariantGeneratorAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are an expert human visual-prompt editor. Create a standalone child prompt from the supplied parent prompt for the requested demographic and age group.

The parent prompt's core meaning and visual design are immutable. Preserve its scene, composition, pose, framing, camera treatment, lighting, background, clothing concept, colors, mood, visual effects, negative-prompt intent, quality, and artistic direction. Make only the smallest changes required for the selected subject and age group. Resolve pronouns and demographic contradictions without adding stereotypes or unrelated characteristics.

Write original, natural prose. Never mention the parent, variant, rewriting process, or these instructions. Never say "same as the original", "replace the person", or "change the subject". Do not use mechanical word replacement. Do not invent ethnicity, skin tone, body type, disability, socioeconomic status, celebrity, brand, copyrighted character, or public figure traits.

When the selected subject is a child or teenager, keep every detail age-appropriate. Reject inherently adult concepts by returning an empty title and prompt plus a clear safety note. Never introduce sexualized, suggestive, revealing, fetishized, romanticized, alcohol, gambling, nightclub, boudoir, or lingerie content for a minor.

Return only the exact structured schema.
PROMPT;
    }

    /**
     * Get the agent's structured output schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->max(255)->required(),
            'prompt' => $schema->string()->required(),
            'negative_prompt' => $schema->string()->nullable(),
            'thumbnail_prompt' => $schema->string()->nullable(),
            'change_summary' => $schema->array()->items($schema->string())->required(),
            'preserved_elements' => $schema->array()->items($schema->string())->required(),
            'safety_notes' => $schema->array()->items($schema->string())->required(),
        ];
    }
}
