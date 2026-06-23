<template>
	<AppModal :model-value="modelValue" :title="t('printcase.fromLibraryImage')" size="xl" @update:model-value="$emit('update:modelValue', $event)">
		<!-- Вкладки тем -->
		<div class="lib-tabs">
			<button
				v-for="tab in tabs"
				:key="tab.folder"
				class="lib-tabs__item"
				:class="{ 'is-active': activeTab === tab.folder }"
				@click="setTab(tab.folder)"
			>
				{{ tab.name }}
			</button>
		</div>

		<!-- Сітка зображень -->
		<div v-if="loading" class="lib-grid">
			<div v-for="i in 12" :key="i" class="skeleton" style="aspect-ratio: 1" />
		</div>

		<div v-else-if="images.length" class="lib-grid">
			<button v-for="img in images" :key="img" class="lib-grid__item" @click="select(img)">
				<img :src="img" alt="" loading="lazy" />
			</button>
		</div>

		<p v-else class="text-muted text-center">{{ t('other.notFind') }}</p>
	</AppModal>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
	'update:modelValue': [v: boolean]
	select: [url: string]
}>()

const { t } = useI18n()
const config = useRuntimeConfig()

const folders = ['patriot', 'zsu', 'vip', 'animals', 'emoji', 'jokes', 'sport', 'cartoons', 'nature', 'other']

const tabs = computed(() =>
	folders.map((folder) => ({ folder, name: t('printcase.libraryImage.' + folder) }))
)

const activeTab = ref(folders[0])
const images = ref<string[]>([])
const loading = ref(false)

const cache: Record<string, string[]> = {}

async function setTab(folder: string) {
	activeTab.value = folder

	if (cache[folder]) {
		images.value = cache[folder]
		return
	}

	loading.value = true
	try {
		const res = await $fetch<{ files: string[] }>(
			`${config.public.urlApi}printcase/get_library_images/${folder}`
		)
		const base = `${config.public.urlStorage}images/printcase/library/${folder}/`
		cache[folder] = (res?.files || []).map((f) => base + f)
		images.value = cache[folder]
	} catch {
		images.value = []
	}
	loading.value = false
}

// Завантажуємо першу вкладку при відкритті
watch(
	() => props.modelValue,
	(open) => {
		if (open && !images.value.length) setTab(activeTab.value)
	}
)

function select(url: string) {
	emit('select', url)
	emit('update:modelValue', false)
}
</script>

<style scoped>
.lib-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 16px;
}

.lib-tabs__item {
	padding: 7px 15px;
	border-radius: var(--radius-pill);
	background: var(--bg-soft);
	border: 1px solid var(--border-light);
	font-size: 13px;
	font-weight: 600;
	color: var(--text-soft);
	transition: all 0.14s;
}

.lib-tabs__item:hover {
	color: var(--text);
}

.lib-tabs__item.is-active {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
}

.lib-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 10px;
}

.lib-grid__item {
	aspect-ratio: 1;
	padding: 0;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: var(--img-bg);
	border: 2px solid var(--border);
	transition: border-color 0.14s, transform 0.14s;
}

.lib-grid__item:hover {
	border-color: var(--accent);
	transform: scale(1.03);
}

.lib-grid__item img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
</style>
