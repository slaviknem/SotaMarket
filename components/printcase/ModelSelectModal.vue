<template>
	<AppModal :model-value="modelValue" :title="t('printcase.selectModel')" size="md" @update:model-value="$emit('update:modelValue', $event)">
		<input
			v-model="query"
			class="form-control model-search"
			type="search"
			:placeholder="t('header.topbar.searchPlaceholder')"
		/>

		<div class="model-tree">
			<!-- Результати пошуку -->
			<template v-if="query.trim().length >= 2">
				<button
					v-for="m in searchResults"
					:key="m.id"
					class="model-tree__model model-tree__model--flat"
					@click="select(m)"
				>
					{{ m.brend }} {{ m.title }}
				</button>
				<p v-if="!searchResults.length" class="text-muted text-center">{{ t('other.notFind') }}</p>
			</template>

			<!-- Дерево брендів -->
			<template v-else>
				<div v-for="(brand, bi) in brands" :key="brand.url" class="model-tree__brand">
					<button class="model-tree__brand-btn" :class="{ 'is-open': openBrand === bi }" @click="toggleBrand(bi)">
						{{ brand.title }}
						<svg width="11" height="11" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l5 5 5-5"/></svg>
					</button>

					<div v-if="openBrand === bi" class="model-tree__series">
						<template v-for="serie in brand.children || []" :key="serie.url">
							<div class="model-tree__serie">{{ serie.title.replace(' - Serie', '') }}</div>
							<button
								v-for="m in serie.children || []"
								:key="m.url"
								class="model-tree__model"
								@click="select(m)"
							>
								{{ m.title }}
							</button>
						</template>
					</div>
				</div>
			</template>
		</div>
	</AppModal>
</template>

<script setup lang="ts">
const props = defineProps<{
	modelValue: boolean
	brands: any[]
}>()

const emit = defineEmits<{
	'update:modelValue': [v: boolean]
	select: [model: any]
}>()

const { t } = useI18n()

const query = ref('')
const openBrand = ref<number | null>(null)

const toggleBrand = (i: number) => {
	openBrand.value = openBrand.value === i ? null : i
}

// Всі моделі (для пошуку)
const allModels = computed(() => {
	const result: any[] = []
	for (const brand of props.brands) {
		for (const serie of brand.children || []) {
			for (const m of serie.children || []) result.push(m)
		}
	}
	return result
})

const searchResults = computed(() => {
	const q = query.value.trim().toLowerCase()
	return allModels.value
		.filter((m) => `${m.brend} ${m.title}`.toLowerCase().includes(q))
		.slice(0, 40)
})

function select(model: any) {
	emit('select', model)
	emit('update:modelValue', false)
	query.value = ''
}
</script>

<style scoped>
.model-search {
	margin-bottom: 12px;
}

.model-tree {
	max-height: 54vh;
	overflow-y: auto;
}

.model-tree__brand-btn {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 11px 12px;
	font-size: 14.5px;
	font-weight: 700;
	color: var(--text);
	border-radius: var(--radius-sm);
	text-align: left;
}

.model-tree__brand-btn:hover,
.model-tree__brand-btn.is-open {
	background: var(--accent-soft);
	color: var(--accent);
}

.model-tree__brand-btn svg {
	transition: transform 0.18s;
}

.model-tree__brand-btn.is-open svg {
	transform: rotate(180deg);
}

.model-tree__series {
	padding: 4px 0 8px;
}

.model-tree__serie {
	padding: 9px 14px 4px;
	font-size: 11.5px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}

.model-tree__model {
	display: block;
	width: 100%;
	padding: 8px 22px;
	font-size: 14px;
	color: var(--text-soft);
	text-align: left;
	border-radius: var(--radius-sm);
}

.model-tree__model--flat {
	padding: 10px 12px;
	font-weight: 600;
}

.model-tree__model:hover {
	background: var(--bg-elevated);
	color: var(--accent);
}
</style>
