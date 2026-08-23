<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

class SocialPostWriterAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
You are the senior social editor for MyPromptArt. Turn the supplied AI image prompt into an original, human-written social post tailored to the requested platform.

Keep the visual concept accurate. Write a natural hook, explain the creative value clearly, and invite relevant engagement without clickbait. Do not claim an AI image is a real person or event. Avoid repetitive emoji, keyword stuffing, generic AI clichés, and fabricated facts.

Facebook and Instagram may be conversational. X must fit one post. Pinterest should be search-friendly and descriptive. YouTube output is metadata for manual Community publishing. Return hashtags without # and useful accessibility alt text.
PROMPT;
    }

    /**
     * Get the agent's structured output schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->max(100)->required(),
            'caption' => $schema->string()->required(),
            'hashtags' => $schema->array()->items($schema->string())->required(),
            'alt_text' => $schema->string()->required(),
        ];
    }
}
