<script setup lang="ts">
import type { LayerData } from '~/composables/useLayerStatus'
import type { SubjectChange } from '~/composables/useEditMode'

defineProps<{
  layers: LayerData[]
  flowChain: string[]
}>()

const emit = defineEmits<{
  'select-concept': [iri: string]
  'show-layer-change': [change: SubjectChange]
}>()

/** Map layer color names to Tailwind classes */
const dotClasses: Record<string, string> = {
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
}

const textClasses: Record<string, string> = {
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-emerald-600 dark:text-emerald-400',
}

function changeIcon(type: string): string {
  if (type === 'added') return 'i-heroicons-plus-circle'
  if (type === 'removed') return 'i-heroicons-minus-circle'
  return 'i-heroicons-pencil'
}

function changeColor(type: string): string {
  if (type === 'added') return 'text-success'
  if (type === 'removed') return 'text-error'
  return 'text-warning'
}
</script>

<template>
  <Teleport to="#edit-toolbar-slot">
    <div class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-1">
        <div class="flex items-center gap-4">
          <!-- Layer segments -->
          <div
            v-for="layer in layers"
            :key="layer.name"
            class="flex items-center"
          >
            <UPopover
              v-if="layer.count > 0"
              :content="{ align: 'start', side: 'bottom' }"
              :ui="{ content: 'z-50' }"
            >
              <button
                type="button"
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                :class="textClasses[layer.color]"
              >
                <span class="w-2 h-2 rounded-full shrink-0" :class="dotClasses[layer.color]" />
                <span class="font-semibold">{{ layer.count }}</span>
                <span>{{ layer.label }}</span>
              </button>
              <template #content>
                <div class="w-80 max-h-72 overflow-y-auto p-2 space-y-1">
                  <p class="text-xs font-medium text-muted px-2 mb-2 capitalize">{{ layer.label }}</p>
                  <div
                    v-for="change in layer.changes"
                    :key="change.subjectIri"
                    class="px-2 py-1.5 rounded-md hover:bg-muted/10 text-sm cursor-pointer"
                    @click="emit('show-layer-change', change)"
                  >
                    <div class="flex items-center gap-1.5">
                      <UIcon
                        :name="changeIcon(change.type)"
                        :class="changeColor(change.type)"
                        class="size-3.5 shrink-0"
                      />
                      <span class="font-medium truncate">{{ change.subjectLabel }}</span>
                      <span class="text-muted text-xs ml-auto shrink-0">
                        ({{ change.propertyChanges.length }})
                      </span>
                    </div>
                    <div
                      v-for="pc in change.propertyChanges"
                      :key="pc.predicateIri"
                      class="text-xs text-muted ml-5 mt-0.5"
                    >
                      {{ pc.predicateLabel }}: {{ pc.type }}
                    </div>
                  </div>
                </div>
              </template>
            </UPopover>

            <!-- Zero-count: dimmed, no popover -->
            <div
              v-else
              class="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted/40"
            >
              <!-- Loading spinner -->
              <UIcon
                v-if="layer.loading"
                name="i-heroicons-arrow-path"
                class="size-3 animate-spin"
              />
              <span v-else class="w-2 h-2 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600" />
              <span class="font-semibold">0</span>
              <span>{{ layer.label }}</span>
              <UTooltip v-if="layer.error" :text="layer.error">
                <UIcon name="i-heroicons-exclamation-triangle" class="size-3 text-error" />
              </UTooltip>
            </div>
          </div>

          <!-- Spacer -->
          <div class="flex-1" />

          <!-- Flow chain -->
          <div v-if="flowChain.length" class="text-[10px] text-muted/60 hidden sm:flex items-center gap-1">
            <template v-for="(step, i) in flowChain" :key="i">
              <span v-if="i > 0">&larr;</span>
              <span>{{ step }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
