<?php

namespace App\Http\Requests;

use App\Models\Prompt;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkUpdatePromptsRequest extends FormRequest
{
    public const ACTION_DELETE = 'delete';

    public const ACTION_STATUS = 'status';

    public const ACTION_CATEGORY = 'category';

    public const ACTION_RETRY = 'retry';

    public const ACTION_PUBLISH = 'publish';

    public const ACTION_DRAFT = 'draft';

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Prompt::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', 'string', Rule::in([
                self::ACTION_DELETE,
                self::ACTION_STATUS,
                self::ACTION_CATEGORY,
                self::ACTION_RETRY,
                self::ACTION_PUBLISH,
                self::ACTION_DRAFT,
            ])],
            'prompt_ids' => ['required', 'array', 'min:1', 'max:250'],
            'prompt_ids.*' => ['integer', Rule::exists(Prompt::class, 'id')],
            'status' => ['required_if:action,'.self::ACTION_STATUS, 'nullable', 'string', Rule::in(Prompt::STATUSES)],
            'category' => ['required_if:action,'.self::ACTION_CATEGORY, 'nullable', 'string', Rule::in(Prompt::CATEGORIES)],
        ];
    }
}
