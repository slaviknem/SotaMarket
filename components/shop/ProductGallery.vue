<template>
	<div class="gallery">
		<div class="gallery__main">
			<a :href="url.productBig(currentImage?.image_file)" target="_blank" rel="noopener">
				<AppImage
					:src="url.productBig(currentImage?.image_file)"
					:alt="alt"
					fetchpriority="high"
					loading="eager"
					preload
					:width="600"
					:height="600"
				/>
			</a>
		</div>

		<div v-if="images.length > 1" class="gallery__thumbs">
			<button
				v-for="(img, i) in images"
				:key="img.id"
				class="gallery__thumb"
				:class="{ 'is-active': i === current }"
				@click="current = i"
			>
				<AppImage :src="url.productThumb(img.image_file)" :alt="`${alt} ${i + 1}`" :width="72" :height="72" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	images: any[]
	alt: string
}>()

const url = useUrl()
const current = ref(0)

const currentImage = computed(() => props.images[current.value] || props.images[0])

// При зміні набору зображень (вибір атрибута) — показуємо перше
watch(
	() => props.images,
	() => (current.value = 0)
)
</script>

<style scoped>
.gallery__main {
	background: var(--img-bg);
	border-radius: var(--radius);
	overflow: hidden;
	border: 1px solid var(--border);
	/* Рівна тонка рамка з усіх боків замість великих білих смуг зверху/знизу */
	padding: 5px;
}

.gallery__main img {
	display: block;
	width: 100%;
	/* Природні пропорції фото — без letterbox (квадрат більше не нав'язуємо) */
	height: auto;
	aspect-ratio: auto;
	object-fit: contain;
	border-radius: var(--radius-sm);
}

.gallery__thumbs {
	display: flex;
	gap: 8px;
	margin-top: 10px;
	overflow-x: auto;
	padding-bottom: 4px;
}

.gallery__thumb {
	width: 70px;
	height: 70px;
	border-radius: var(--radius-sm);
	overflow: hidden;
	background: var(--img-bg);
	border: 2px solid var(--border);
	padding: 0;
	flex-shrink: 0;
	transition: border-color 0.15s;
}

.gallery__thumb img {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.gallery__thumb.is-active,
.gallery__thumb:hover {
	border-color: var(--accent);
}
</style>
