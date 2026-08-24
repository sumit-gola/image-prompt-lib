<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

class VideoCinematicAnalyzer implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are an expert cinematographer and prompt engineer. Analyze the attached chronological frames as one reference video. Describe subjects generically and never identify real people. Reconstruct shot language, composition, camera angles and movement, subject movement, timing, environment, landscape, lighting, palette, depth, transitions, pacing and post-production. Clearly label uncertain inferences. Produce directly reusable prompts for a new, visually similar cinematic video, not a frame-for-frame duplicate. Incorporate the user's requested changes while preserving the reference's cinematic structure. Return only the structured schema.
PROMPT;
    }

    /**
     * Get the agent's structured output schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'summary' => $schema->string()->required(),
            'scenes' => $schema->array()->items($schema->object(fn (JsonSchema $schema): array => [
                'timing' => $schema->string()->required(),
                'visuals' => $schema->string()->required(),
                'camera' => $schema->string()->required(),
                'movement' => $schema->string()->required(),
                'lighting' => $schema->string()->required(),
                'transition' => $schema->string()->required(),
            ]))->required(),
            'master_prompt' => $schema->string()->required(),
            'shot_by_shot_prompt' => $schema->string()->required(),
            'technical_prompt' => $schema->string()->required(),
            'negative_prompt' => $schema->string()->required(),
            'condensed_prompt' => $schema->string()->required(),
            'confidence_notes' => $schema->string()->required(),
        ];
    }
}
