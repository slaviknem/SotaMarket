<template>
	<!-- Умова — дзеркало createError нижче: модельна сторінка без даних іде в 404, а хаб
	     рендериться завжди. Без неї Vue починав рендер обірваного setup'у й сипав
	     Vue-warn про undefined-пропси (breadcrumbs, elements) на кожну невідому модель. -->
	<div v-if="!modelAlias || data" class="container pc-container">
		<Breadcrumbs :items="breadcrumbs" />

		<h1 class="pc-title">{{ h1 }}</h1>
		<p v-if="lead" class="pc-lead">{{ lead }}</p>

		<!-- Одна смужка на два випадки: відновлена чернетка (людина повернулась до свого макета)
		     і правка вже збереженого макета за посиланням з адмінки -->
		<div v-if="restored || designDir" class="pc-note" :class="{ 'pc-note--edit': designDir }">
			<AppIcon :name="designDir ? 'edit' : 'clock'" :size="15" />
			<span v-if="designDir">
				{{ cartItem ? t('printcase.editingCart') : t('printcase.editingDesign') }}
				<b v-if="designMissing"> {{ t('printcase.designMissing', { count: designMissing }) }}</b>
			</span>
			<template v-else>
				<span>{{ t('printcase.draftRestored') }}</span>
				<button class="pc-note__btn" @click="resetStage">{{ t('printcase.draftReset') }}</button>
			</template>
		</div>

		<!-- Перетягування файлів ловимо на всій робочій зоні (макет + панель дій): кинутий
		     повз конструктор файл браузер просто відкрив би замість вкладки -->
		<div
			class="pc-layout"
			@dragenter.prevent="onDragEnter"
			@dragover.prevent="onDragOver"
			@dragleave="onDragLeave"
			@drop.prevent="onDrop"
		>
			<!-- Робоча зона: макет + інструменти на одному білому блоці -->
			<div ref="editorRef" class="pc-editor">
				<!-- Сцена -->
				<div class="pc-stage-col" @pointerdown.self="setActive(null)">
					<PrintcaseStage
						ref="stageCmp"
						:elements="elements"
						:background-color="bgValue"
						:mask-url="maskUrl"
						:has-model="!!model"
						@activate="setActive"
						@remove="removeElement"
						@edit-text="openTextEdit"
						@update-element="updateElement"
						@deselect="setActive(null)"
						@wheel-zoom="(dir) => (dir > 0 ? zoomIn() : zoomOut())"
						@request-model="modelModalOpen = true"
						@add-image="fileInput?.click()"
						@open-library="libraryOpen = true"
					/>
				</div>

				<!-- Панель інструментів (у тому ж білому блоці) -->
				<div class="pc-controls-col">
					<div class="ctrl-group" :class="{ 'is-disabled': activeIndex === null }">
						<button class="ctrl-btn" :title="t('printcase.control.plus')" @click="zoomIn">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8 11h6M11 8v6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.minus')" @click="zoomOut">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8 11h6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.rotateLeft')" @click="rotate(-10)">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.rotateRight')" @click="rotate(10)">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.layerUp')" @click="layerUp">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
						</button>
						<button class="ctrl-btn" :title="t('printcase.control.layerDown')" @click="layerDown">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
						</button>
						<button class="ctrl-btn ctrl-btn--danger" :title="t('printcase.control.delete')" @click="removeElement(activeIndex)">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
						</button>
					</div>

					<!-- Фон макета. Один контрол на всі варіанти: прозорий тут — просто перший свотч
					     у палітрі, а не окремий перемикач поруч (у даних це і є одне значення).
					     Обертання обідця вмикаємо лише на старті (модель є, макет порожній) — разом
					     з «+» на сцені це показує обидва перші кроки; з першим шаром панель затихає. -->
					<div class="ctrl-bg-wrap" @pointerdown.stop>
						<button
							class="ctrl-bg"
							:class="{ 'is-hint': model && !elements.length && !bgPickerOpen, 'is-open': bgPickerOpen }"
							:title="t('printcase.control.colorBG')"
							:aria-expanded="bgPickerOpen"
							@click="bgPickerOpen = !bgPickerOpen"
						>
							<span class="ctrl-bg__ring">
								<span
									class="ctrl-bg__swatch"
									:class="{ 'is-transparent': transparentBg }"
									:style="transparentBg ? undefined : { background: backgroundColor }"
								/>
							</span>
							<span class="ctrl-bg__label">{{ t('printcase.control.bgShort') }}</span>
						</button>

						<!-- Палітра: на десктопі — поповер біля кнопки, на телефоні — нижня шторка.
						     Затемнення під шторкою телепортуємо, щоб воно накрило всю сторінку. -->
						<Teleport to="body">
							<div v-if="bgPickerOpen" class="bg-scrim" />
						</Teleport>

						<div v-if="bgPickerOpen" class="bg-pop" role="dialog" :aria-label="t('printcase.control.bgTitle')">
							<div class="bg-pop__head">
								<span class="bg-pop__title">{{ t('printcase.control.bgTitle') }}</span>
								<button class="bg-pop__close" :aria-label="t('other.close')" @click="bgPickerOpen = false">
									<AppIcon name="close" :size="15" />
								</button>
							</div>

							<div class="bg-pop__grid">
								<!-- Прозорий — рівноправний варіант фону, тому стоїть першим у сітці -->
								<button
									class="bg-sw bg-sw--transparent"
									:class="{ 'is-active': transparentBg }"
									:title="t('printcase.control.transparentShort')"
									@click="setBg('transparent')"
								/>
								<button
									v-for="c in BG_PRESETS"
									:key="c"
									class="bg-sw"
									:class="{ 'is-active': !transparentBg && isSameColor(c, backgroundColor) }"
									:style="{ background: c }"
									@click="setBg(c)"
								/>
								<!-- Свій колір: нативний вибір ховаємо за свотчем зі спектром -->
								<label class="bg-sw bg-sw--custom" :class="{ 'is-active': isCustomBg }" :title="t('printcase.control.bgCustom')">
									<input :value="backgroundColor" type="color" @input="setBgFromInput" />
									<span class="bg-sw__dot" :style="isCustomBg ? { background: backgroundColor } : undefined" />
								</label>
							</div>

							<!-- Точний код кольору: коли фон треба підігнати під фірмовий,
							     а не підбирати «на око» повзунками -->
							<div class="bg-hex">
								<span class="bg-hex__hash" aria-hidden="true">#</span>
								<input
									v-model="bgHex"
									class="bg-hex__input"
									type="text"
									maxlength="6"
									spellcheck="false"
									autocomplete="off"
									placeholder="FFFFFF"
									:aria-label="t('printcase.control.bgCustom')"
									@input="applyBgHex"
									@blur="resetBgHex"
								/>
							</div>

							<!-- Пояснюємо наслідок вибору, а не назву кольору: «прозорий» без цього
							     рядка читається як службовий термін із графічних редакторів -->
							<p class="bg-pop__note">
								{{ transparentBg ? t('printcase.control.transparentHint') : t('printcase.control.bgColorHint') }}
							</p>
						</div>
					</div>
				</div>

				<!-- Ціль перетягування: підсвічуємо весь блок макета, поки файл над сторінкою -->
				<div v-if="dragOver" class="pc-drop">
					<AppIcon name="plus" :size="30" :stroke-width="2.2" />
					{{ t('printcase.dropHint') }}
				</div>
			</div>

			<!-- Панель дій. Без вибраної моделі інструменти не зникають, а стоять неактивними:
			     колонка не порожніє поряд з високим макетом, і одразу видно, що вміє конструктор.
			     Клік по будь-якому з них веде до вибору моделі — «мертвих» кнопок немає. -->
			<div class="pc-actions-col">
				<!-- Вибрана модель -->
				<button class="pc-model-btn" @click="modelModalOpen = true">
					<span>{{ model ? model.name : t('printcase.selectModel') }}</span>
					<AppIcon name="edit" :size="15" />
				</button>

				<p v-if="!model" class="pc-locked-note">
					<AppIcon name="lock" :size="14" />
					{{ t('printcase.lockedHint') }}
				</p>

				<!-- Дії -->
				<input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="addImagesFromDisk" />

				<!-- Ctrl+V і перетягування — у title: окремим рядком підказка з'їдала місце
				     в колонці, а спосіб і так очевидний тим, хто ним користується -->
				<button
					class="pc-action"
					:class="{ 'is-locked': !model }"
					:aria-disabled="!model"
					:title="t('printcase.addImageHint')"
					@click="withModel(() => fileInput?.click())"
				>
					<span class="pc-action__icon">
						<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
					</span>
					{{ t('printcase.addImage') }}
				</button>

				<!-- Текст: коли виділено текст — зліва «+» додавання, праворуч редагування з прев'ю тексту -->
				<div v-if="isActiveText" class="pc-action pc-action--split" @pointerdown.stop>
					<button class="pc-action__add" :title="t('printcase.addText')" @click="openTextAdd">
						<span class="pc-action__icon">
							<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>
							<span class="pc-action__plus">+</span>
						</span>
					</button>
					<button class="pc-action__edit" :title="t('printcase.editText')" @click="openTextEdit(activeIndex)">
						<AppIcon name="edit" :size="16" />
						<span class="pc-action__edit-txt" :style="{ fontFamily: `'${activeEl?.font}', sans-serif` }">{{ activeEl?.text || t('printcase.editText') }}</span>
					</button>
				</div>

				<button v-else class="pc-action" :class="{ 'is-locked': !model }" :aria-disabled="!model" @click="withModel(openTextAdd)">
					<span class="pc-action__icon">
						<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>
					</span>
					{{ t('printcase.addText') }}
				</button>

				<button class="pc-action" :class="{ 'is-locked': !model }" :aria-disabled="!model" @click="withModel(() => (libraryOpen = true))">
					<span class="pc-action__icon">
						<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
					</span>
					{{ t('printcase.fromLibraryImage') }}
				</button>

				<!-- Шари -->
				<div v-if="elements.length" class="pc-layers card" @pointerdown.stop>
					<div class="pc-panel-title">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
						{{ t('printcase.layers') }}

						<!-- Очищення всього макета: другий клік підтверджує (намальоване не повернеш) -->
						<button
							class="pc-layers__clear"
							:class="{ 'is-armed': clearArmed }"
							:title="t('printcase.clearAll')"
							@click="onClearClick"
						>
							<AppIcon name="close" :size="12" :stroke-width="2.6" />
							{{ clearArmed ? t('printcase.clearConfirm') : t('printcase.clearAll') }}
						</button>
					</div>
					<div
						v-for="(el, revIdx) in reversedElements"
						:key="elements.length - 1 - revIdx"
						class="pc-layer"
						:class="{
							'is-active': activeIndex === elements.length - 1 - revIdx,
							'is-hidden': el.hidden,
						}"
						@click="onLayerClick(elements.length - 1 - revIdx)"
					>
						<!-- draggable="false": інакше перетягнута мініатюра сама себе кидає на макет як текст -->
						<img v-if="el.type === 'image'" :src="el.url" class="pc-layer__thumb" alt="" draggable="false" />
						<span v-else class="pc-layer__thumb pc-layer__thumb--text">T</span>
						<span class="pc-layer__name">
							{{ el.type === 'text' ? el.text : `${t('printcase.layerImage')} ${elements.length - revIdx}` }}
						</span>
						<div class="pc-layer__actions">
							<!-- Правка напису прямо зі списку: інакше треба спершу вибрати шар,
							     а потім шукати кнопку редагування в панелі дій -->
							<button
								v-if="el.type === 'text'"
								class="pc-layer__btn"
								:title="t('printcase.editText')"
								@click.stop="editLayerText(elements.length - 1 - revIdx)"
							>
								<AppIcon name="edit" :size="13" />
							</button>
							<button
								v-if="canDownloadLayers && el.type === 'image'"
								class="pc-layer__btn"
								:title="t('printcase.layerDownload')"
								@click.stop="downloadLayer(elements.length - 1 - revIdx)"
							>
								<AppIcon name="download" :size="14" />
							</button>
							<button
								class="pc-layer__btn"
								:class="{ 'is-off': el.hidden }"
								:title="el.hidden ? t('printcase.layerShow') : t('printcase.layerHide')"
								:aria-pressed="!el.hidden"
								@click.stop="toggleHidden(elements.length - 1 - revIdx)"
							>
								<AppIcon :name="el.hidden ? 'eye-off' : 'eye'" :size="14" />
							</button>
							<button class="pc-layer__btn" :disabled="revIdx === 0" :title="t('printcase.control.layerUp')" @click.stop="moveLayerUp(elements.length - 1 - revIdx)">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
							</button>
							<button class="pc-layer__btn" :disabled="revIdx === elements.length - 1" :title="t('printcase.control.layerDown')" @click.stop="moveLayerDown(elements.length - 1 - revIdx)">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
							</button>
							<button class="pc-layer__btn pc-layer__btn--del" :title="t('printcase.control.delete')" @click.stop="removeElement(elements.length - 1 - revIdx)">
								<AppIcon name="close" :size="13" :stroke-width="2.4" />
							</button>
						</div>
					</div>
				</div>

				<!-- Поки модель не вибрана — на місці шарів стоїть інструкція: колонка
				     заповнена, а кроки HowTo-розмітки хаба отримують видимий текст -->
				<div v-if="!model" class="pc-steps card">
					<h2 class="pc-panel-title">
						<AppIcon name="bolt" :size="15" />
						{{ t('printcase.howItWorks') }}
					</h2>
					<ol class="pc-steps__list">
						<li v-for="i in 4" :key="i" class="pc-step">
							<span class="pc-step__num">{{ i }}</span>
							<span class="pc-step__body">
								<b>{{ t(`printcase.seo.howTo.step${i}.name`) }}</b>
								{{ t(`printcase.seo.howTo.step${i}.text`) }}
							</span>
						</li>
					</ol>
				</div>

				<!-- Ціна та купівля -->
				<div class="pc-buy card">
					<div class="pc-buy__prices">
						<span class="pc-buy__price">{{ formatPrice(price) }}</span>
						<span class="pc-buy__price-old">{{ formatPrice(priceOld) }}</span>
					</div>

					<!-- У режимі правки макета кнопка зберігає зміни: знятий із друку статус моделі
					     тут не має блокувати — замовлення вже існує, міняється лише картинка -->
					<button
						v-if="model"
						class="btn btn-lg btn-block"
						:class="modelStock === 'in' || designDir ? 'btn-primary' : 'btn-outline'"
						:disabled="generating || !visibleElements.length || (modelStock === 'out' && !designDir)"
						@click="order"
					>
						<AppIcon
							v-if="!generating"
							:name="designDir ? 'edit' : modelStock === 'pre_order' ? 'clock' : 'cart'"
							:size="18"
						/>
						{{ buyLabel }}
					</button>

					<button v-else class="btn btn-lg btn-block btn-outline" @click="modelModalOpen = true">
						{{ t('printcase.seo.pickModel') }}
					</button>
				</div>
			</div>
		</div>

		<!-- Швидкий вхід у конструктор під конкретну модель (хаб): кожна модель — своя сторінка -->
		<section v-if="popularModels.length" class="pc-block">
			<div class="section-title">
				<h2>{{ t('printcase.seo.pickModel') }}</h2>
			</div>
			<p class="pc-block__note text-muted">{{ t('printcase.seo.pickModelNote') }}</p>
			<nav class="pc-models" :aria-label="t('printcase.seo.pickModel')">
				<NuxtLink v-for="m in popularModels" :key="m.alias" :to="url.printcase(m.alias)" class="chip">
					{{ m.title }}
				</NuxtLink>
				<button class="chip pc-models__more" @click="modelModalOpen = true">
					{{ t('printcase.selectModel') }}
				</button>
			</nav>
		</section>

		<!-- Готові дизайни: той самий друк, але без малювання. Унікальний контент і
		     перелінковка на /neoprint/{модель}/{дизайн}.
		     Стоять вище статті: після конструктора користувачу потрібен наступний крок
		     (обрати готовий принт), а не текст. -->
		<section v-if="designs.length && category" class="pc-block">
			<div class="section-title">
				<h2>{{ designsTitle }}</h2>
			</div>
			<p class="pc-block__note text-muted">{{ t('printcase.seo.designsNote', { model: names.short_ }) }}</p>

			<!-- Меню тем: клік перемикає показані дизайни ТУТ, без переходу — інакше зник би
			     намальований макет. Чипи лишаються справжніми посиланнями на фільтр-сторінки
			     моделі (краулери, нова вкладка), звичайний клік перехоплюємо. -->
			<nav v-if="themeTree.length" class="theme-nav" :aria-label="t('filters.type.theme')">
				<div class="theme-nav__row">
					<button
						class="chip theme-nav__chip"
						:class="{ 'is-active': !selectedParentAlias }"
						@click="resetTheme"
					>
						{{ t('printcase.seo.allThemes') }}
					</button>
					<a
						v-for="tp in themeTree"
						:key="tp.alias"
						:href="url.category(category.alias, tp.alias)"
						class="chip theme-nav__chip"
						:class="{ 'is-active': tp.alias === selectedParentAlias }"
						@click="onThemeClick($event, tp)"
					>
						{{ tp.title }}
					</a>
				</div>

				<!-- Підтеми лише активної теми: інакше на сторінці було б під сотню анкорів -->
				<div v-if="subthemes.length" class="theme-nav__sub">
					<a
						v-for="st in subthemes"
						:key="st.alias"
						:href="url.category(category.alias, st.alias)"
						class="theme-nav__sublink"
						:class="{ 'is-active': st.alias === selectedChildAlias }"
						@click="onSubthemeClick($event, st)"
					>
						{{ st.title }}
					</a>
				</div>
			</nav>

			<div class="products-grid products-grid--left" :class="{ 'is-switching': switching }">
				<NeoPrintCard v-for="np in designs" :key="np.id" :neoprint="np" :category="category" />
			</div>
		</section>

		<!-- SEO-стаття: своя стаття моделі → шаблон із підставленою моделлю → (нічого) -->
		<article v-if="articleHtml" class="pc-block typography" v-html="contentHtml(articleHtml)" />

		<!-- FAQ під модель: питання будуються з даних сторінки, JSON-LD — усередині ShopFaqList -->
		<ShopFaqList v-if="faqItems.length" :title="t('printcase.seo.faq.title', { model: names.full })" :items="faqItems" />

		<!-- Перелінковка: конструктор моделі → хаб конструктора, каталог моделі та бренду.
		     Посилання на хаб важливе: раніше всі моделі жили на ?model= з canonical на /printcase
		     і вся вага йшла туди. Тепер у кожної моделі своя адреса, тож хаб має отримувати
		     зворотні посилання з них — інакше лишається лише з хедера/футера. -->
		<nav v-if="category" class="pc-links" :aria-label="t('neoprint.seeAlso')">
			<span class="pc-links__label">{{ t('neoprint.seeAlso') }}:</span>
			<NuxtLink :to="url.printcase()" class="chip">
				{{ t('printcase.seo.hubLink') }}
			</NuxtLink>
			<NuxtLink :to="url.category(category.alias)" class="chip">
				{{ t('neoprint.allModel', { model: names.short_ }) }}
			</NuxtLink>
			<NuxtLink v-if="category.brend" :to="url.category(category.brend.alias)" class="chip">
				{{ t('neoprint.allBrand', { brend: category.brend.title }) }}
			</NuxtLink>
		</nav>

		<!-- Відгуки про конструктор. На сторінці моделі — відгуки саме цієї моделі (свій
		     контент на кожній адресі, не дубль), на хабі — усі відгуки конструктора, включно
		     з відгуками всіх моделей. Мова не розділяє список: відгук про послугу один для
		     укр- і рос-версій. page-url — бо на цій сторінці адресу переписує replaceState. -->
		<ShopReviewsBlock
			:reviews="reviews"
			type="printcase"
			:target-id="model?.id || 0"
			:page-url="url.printcase(model?.alias)"
			:title="
				isModelPage
					? t('printcase.seo.reviewsTitle', { model: names.full })
					: t('printcase.seo.reviewsTitleHub')
			"
			class="pc-block"
		/>

		<!-- Модалки -->
		<PrintcaseModelSelectModal v-model="modelModalOpen" @select="selectModel" />
		<PrintcaseLibraryModal v-model="libraryOpen" @select="addImageFromLibrary" />
		<PrintcaseTextModal
			v-model="textModalOpen"
			:fonts="fonts"
			:is-edit="textEditMode"
			:initial="textForm"
			:bg="transparentBg ? '#FFFFFF' : backgroundColor"
			@save="saveText"
		/>
	</div>
</template>

<script setup lang="ts">
// Конструктор чохлів. Один компонент обслуговує два роути:
//   /printcase           — хаб: велика стаття про послугу + вхід у конструктор
//   /printcase/{модель}  — лендінг під модель: той самий конструктор + свій текст,
//                          готові дизайни та FAQ саме цієї моделі
//
// ?model= лишається робочим коротким шляхом (внутрішні посилання, розсилки) і 301-иться
// на /printcase/{модель} — у видачі має бути одна адреса.
//
// Вибір іншої моделі НЕ навігує роутером (це знищило б намальоване), а переписує URL через
// history.replaceState і підвантажує контент нової моделі — як перемикання дизайну на
// сторінці /neoprint.

import type { IThemeDesign, IThemeNode } from '~/composables/useThemeDesigns'
import type { StageEl } from '~/components/printcase/StageElement.vue'
import type { TextForm } from '~/components/printcase/TextModal.vue'
import { STAGE_W, STAGE_H } from '~/components/printcase/PrintcaseStage.vue'

const props = defineProps<{ modelAlias?: string }>()

const { t, locale } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const shopApi = useShopApi()
const cart = useCart()
const { openCart } = useCartDrawer()
const { openPreOrder } = usePreOrder()
const { notify } = useNotify()
const url = useUrl()
// Макет: маніфест + фото клієнта (сервер) і чернетка (браузер)
const design = usePrintcaseDesign()
const draft = usePrintcaseDraft()

// Ціни з налаштувань адмінки. Читаємо один раз значенням, а не computed: на SSR стан уже
// заповнений, а всередині сторінки ціна не змінюється — зате її можна класти в замовлення,
// JSON-LD і тексти напряму, без .value у двадцяти місцях.
const { prices } = useSiteSettings()
const price = prices.value.printcase
const priceOld = prices.value.printcase_old

// Модель у конструкторі: рівно те, що потрібно сцені, кошику і текстам
interface PcModel {
	id: number
	alias: string
	name: string // повна назва: «Samsung Galaxy A07»
	// Статус друку з адмінки: одразу в кошик / лише передзамовлення / знято з друку
	stock: StockState
}

// ---------- Дані сторінки (SSR) ----------
// Лендінг моделі: категорія + її стаття + шаблон статті + добірка дизайнів — одна хвиля.
// Стаття своя (printcase-{модель}) має пріоритет над шаблоном (printcase-template),
// у якому підставляються плейсхолдери моделі — та сама механіка, що на сторінках фільтрів.
async function fetchModelBundle(alias: string) {
	const [category, own, tpl, designs, filters, reviews] = await Promise.all([
		shopApi.getCategoryByAlias(alias),
		shopApi.getArticleByAlias(`printcase-${alias}`),
		shopApi.getArticleByAlias('printcase-template'),
		$fetch<any[]>('/api/printcase/designs', { params: { lang: locale.value } }).catch(() => []),
		// Дерево тем для меню над дизайнами. У ту саму хвилю — latency не росте, а payload
		// тримаємо коротким: лише alias/title/id тем і підтем (лічильники тут не потрібні).
		shopApi.getFilters(alias).catch(() => []),
		// Відгуки про друк саме на цю модель (type=printcase, category_id=модель)
		shopApi.getPrintcaseReviews(alias).catch(() => []),
	])

	if (!category?.id || category.type !== 'model') return null

	// Плейсхолдери моделі підставляються і в текст шаблона, і в його meta — щоб title/description
	// сторінок моделей теж керувались з адмінки, а не лише з i18n
	const ownArticle = own?.publish ? own : null
	const tplArticle = tpl?.publish ? tpl : null
	const fromTpl = (field: string) => (tplArticle ? fillModelPlaceholders(tplArticle[field], category) : '')

	const ownText = ownArticle?.text || ''
	const tplText = fromTpl('text')

	return {
		model: {
			id: category.id,
			alias: category.alias,
			name: category.title_full || category.title,
			stock: printStockState(category),
		} as PcModel,
		// Для карток дизайнів, крихт і перелінковки — без відгуків і описів категорії:
		// вони на цій сторінці не малюються, а в payload важили б найбільше
		category: {
			id: category.id,
			alias: category.alias,
			title: category.title,
			title_full: category.title_full,
			title_rus: category.title_rus,
			printcase: category.printcase,
			// Потрібен карткам готових дизайнів нижче: друк на цю модель може бути
			// лише під передзамовлення (або взагалі знятий)
			alphaprint_available: category.alphaprint_available,
			brend: category.brend ? { alias: category.brend.alias, title: category.brend.title } : null,
		},
		articleHtml: ownText || tplText,
		// H1 з адмінки — лише у власної статті моделі: у шаблона в title лежить службова
		// назва («Шаблон статті…»), її на сторінку виводити не можна
		articleTitle: ownArticle?.title || '',
		metaTitle: ownArticle?.meta_title || fromTpl('meta_title'),
		metaDescription: ownArticle?.meta_description || fromTpl('meta_description'),
		designs: category.printcase ? designs : [],
		themeTree: category.printcase ? buildThemeTree(filters) : [],
		reviews: (reviews || []) as any[],
		popularModels: [] as { alias: string; title: string }[],
	}
}

// Хаб: велика стаття про послугу + популярні моделі як швидкий вхід.
// Повний обхід усіх /printcase/{модель} краулер робить не звідси, а зі сторінок моделей —
// там картка конструктора стоїть першою в сітці товарів.
async function fetchHubBundle() {
	const [article, popular, reviews] = await Promise.all([
		shopApi.getArticleByAlias('printcase'),
		shopApi.getPopularCategory({ type: 'model', limit: 8 }),
		// Хаб збирає відгуки про конструктор з усіх моделей — тут вони всі разом
		shopApi.getPrintcaseReviews().catch(() => []),
	])

	return {
		model: null,
		category: null,
		articleHtml: article?.text || '',
		// H1 хаба керується з адмінки (як на старому сайті) — i18n лишається фолбеком
		articleTitle: article?.title || '',
		metaTitle: article?.meta_title || '',
		metaDescription: article?.meta_description || '',
		designs: [] as any[],
		themeTree: [] as IThemeNode[],
		reviews: (reviews || []) as any[],
		popularModels: (popular || []).map((m: any) => ({ alias: m.alias, title: m.title_full || m.title })),
	}
}

const { data, error } = await useAsyncData(
	`printcase-${props.modelAlias || 'hub'}-${locale.value}`,
	async () => (props.modelAlias ? await fetchModelBundle(props.modelAlias) : await fetchHubBundle())
)

// API не відповів — 503, а не 404 (див. throwIfApiDown у useShopApi)
throwIfApiDown(error.value, 'Printcase')

if (props.modelAlias && !data.value) {
	throw createError({ statusCode: 404, statusMessage: 'Model not found', fatal: true })
}

const category = computed(() => data.value?.category || null)
const articleHtml = computed(() => data.value?.articleHtml || '')
const reviews = computed(() => data.value?.reviews || [])
const popularModels = computed(() => data.value?.popularModels || [])

const names = computed(() => catNames(category.value))

// ---------- Готові дизайни та меню тем ----------
// Стартовий набір — мікс різних тем із кешованої ручки (однаковий для всіх моделей).
// Клік по темі підмінює його дизайнами теми ПРЯМО ТУТ: навігація знищила б намальоване,
// рівно з тієї ж причини, що й вибір моделі. URL сторінки при цьому не змінюється —
// /printcase/{модель} має лишатись однією адресою у видачі.
const mixedDesigns = computed<IThemeDesign[]>(() => data.value?.designs || [])
const designs = ref<IThemeDesign[]>([...mixedDesigns.value])
const themeTree = computed<IThemeNode[]>(() => (data.value?.themeTree || []) as IThemeNode[])

const { switching, applyTheme, isModifiedClick } = useThemeDesigns(designs)

const selectedParentAlias = ref<string | null>(null)
const selectedChildAlias = ref<string | null>(null)

const selectedParent = computed(() => themeTree.value.find((tn) => tn.alias === selectedParentAlias.value) || null)
const subthemes = computed(() => selectedParent.value?.children || [])

// Назва активної теми для заголовка секції («Готові дизайни: Квіти для Galaxy S25»)
const activeThemeTitle = computed(() => {
	if (selectedChildAlias.value) {
		const c = subthemes.value.find((s) => s.alias === selectedChildAlias.value)
		if (c) return c.title
	}
	return selectedParent.value?.title || ''
})

const designsTitle = computed(() =>
	activeThemeTitle.value
		? t('printcase.seo.designsTheme', { theme: activeThemeTitle.value, model: names.value.short_ })
		: t('printcase.seo.designs', { model: names.value.short_ })
)

// Повернення до стартового міксу тем
function resetTheme() {
	selectedParentAlias.value = null
	selectedChildAlias.value = null
	designs.value = [...mixedDesigns.value]
}

function selectTopTheme(node: IThemeNode) {
	if (node.alias === selectedParentAlias.value && !selectedChildAlias.value) return
	applyTheme(node, () => {
		selectedParentAlias.value = node.alias
		selectedChildAlias.value = null
	})
}

// Клік по підтемі → її дизайни; якщо власних немає (прив'язані до теми-батька) — показуємо
// всю батьківську тему, щоб клік не був «мертвим»
async function selectSubtheme(node: { alias: string; id: number }) {
	if (node.alias === selectedChildAlias.value) return
	const applied = await applyTheme(node, () => {
		selectedChildAlias.value = node.alias
	})
	if (!applied && selectedParent.value) {
		applyTheme(selectedParent.value, () => {
			selectedChildAlias.value = null
		})
	}
}

// Чипи лишаються справжніми посиланнями на фільтр-сторінки моделі (краулери, нова вкладка),
// а звичайний клік перемикає набір дизайнів тут
function onThemeClick(e: MouseEvent, node: IThemeNode) {
	if (isModifiedClick(e)) return
	e.preventDefault()
	selectTopTheme(node)
}

function onSubthemeClick(e: MouseEvent, node: { alias: string; id: number }) {
	if (isModifiedClick(e)) return
	e.preventDefault()
	selectSubtheme(node)
}

// ---------- Модель та маска ----------
const DEFAULT_MASK = '/images/printcase/default_mask.png'

const model = ref<PcModel | null>(data.value?.model || null)
const maskUrl = ref<string | null>(null)
const modelModalOpen = ref(false)

const orderId = computed(() => {
	const v = route.query.order_id
	return (Array.isArray(v) ? v[0] : v) || null
})

// Правка вже збереженого макета: адмінка відкриває конструктор із ?design={id}_{token}
// (посилання будує редірект /printcase_edit/{id}/{модель}). Кнопка купівлі стає «зберегти»,
// і всі файли переписуються на місці — під тим самим id, який уже стоїть у замовленні.
const designDir = computed(() => {
	const v = route.query.design
	const dir = (Array.isArray(v) ? v[0] : v) || ''
	return /^\d{9,12}_[a-f0-9]{10}$/.test(dir) ? dir : null
})

// Скільки фото макета не знайшлось (минуло 30 днів або не долились) — про це кажемо вголос
const designMissing = ref(0)

// Той самий макет може відкриватись із двох боків: менеджером із замовлення і покупцем
// із кошика. Механіка одна, різні лише напис і те, куди повертати після збереження.
const cartItem = computed(() =>
	designDir.value ? cart.state.value.items.find((i) => i.printcaseDir === designDir.value) : undefined
)

// Стан друку обраної моделі веде і напис на кнопці, і саму дію
const modelStock = computed<StockState>(() => model.value?.stock || 'in')

const buyLabel = computed(() => {
	if (generating.value) return t('category.loading')
	if (designDir.value) return t('printcase.saveDesign')
	if (orderId.value) return `+ № ${orderId.value}`
	if (modelStock.value === 'out') return t('product.notStock')
	return modelStock.value === 'in' ? t('product.inCart') : t('quick.quickPreOrder')
})

// Маска моделі з адмінки, fallback — стандартна. Тільки клієнт: це base64-картинка,
// у SSR-payload вона важила б сотні кілобайт.
async function loadMask(alias: string) {
	maskUrl.value = DEFAULT_MASK

	// Друга спроба: на мобільному інтернеті один зірваний запит лишав би чохол без вирізів
	// під камери на весь сеанс — і людина малювала б макет по неправильному силуету
	for (const attempt of [0, 1]) {
		try {
			const res = await $fetch<{ base64Image?: string }>(
				`${config.public.urlApi}printcase/get_image_b64/${alias}.png/masks`
			)
			if (res?.base64Image) maskUrl.value = res.base64Image
			return
		} catch (e: any) {
			// 404 — маски для моделі просто немає, повторювати нема сенсу
			if (attempt || e?.response?.status === 404) return
			await new Promise((r) => setTimeout(r, 1200))
		}
	}
}

// Вибір моделі в модалці: URL і весь контент сторінки йдуть за моделлю, але без навігації —
// інакше конструктор перемонтувався б і намальоване зникло
async function selectModel(m: any) {
	const alias = String(m.url)
	if (alias === model.value?.alias) return

	// Статус приїде з бандлом моделі (нижче); до того вважаємо друк доступним —
	// кнопка все одно мовчить, поки на макеті нічого не намальовано
	model.value = {
		id: m.id,
		alias,
		name: [m.brend, m.title].filter(Boolean).join(' '),
		stock: 'in',
	}
	await loadModelPage(alias)
}

// Маска, адреса та контент сторінки під обрану модель. Тим самим шляхом іде і відновлена
// з чернетки модель на хабі — там теж потрібні і маска, і стаття, і дизайни саме цієї моделі.
async function loadModelPage(alias: string) {
	loadMask(alias)

	const href = url.printcase(alias) + location.search
	history.replaceState({ ...history.state, current: href }, '', href)

	const bundle = await fetchModelBundle(alias)
	if (!bundle) return
	data.value = bundle
	model.value = bundle.model
	// Теми в іншої моделі свої — вибір скидаємо на стартовий мікс нового бандла
	resetTheme()
}

onMounted(() => {
	if (model.value) loadMask(model.value.alias)
})

// Інструменти без моделі стоять неактивними (клас is-locked), але клік по них не «мертвий» —
// відкриває вибір моделі: це рівно той крок, якого бракує
function withModel(fn: () => void) {
	if (!model.value) {
		modelModalOpen.value = true
		return
	}
	fn()
}

// ---------- Елементи ----------
const elements = ref<StageEl[]>([])
const activeIndex = ref<number | null>(null)
const libraryOpen = ref(false)

const reversedElements = computed(() => [...elements.value].reverse())

// Що реально буде надруковано: сховані «оком» шари лишаються в списку, але не йдуть у макет
const visibleElements = computed(() => elements.value.filter((el: StageEl) => !el.hidden))

// Активний елемент і чи це текст (для кнопки редагування тексту)
const activeEl = computed(() => (activeIndex.value !== null ? elements.value[activeIndex.value] : null))
const isActiveText = computed(() => activeEl.value?.type === 'text')

const stageCmp = ref<any>()
const fileInput = ref<HTMLInputElement>()
const editorRef = ref<HTMLElement>()

function setActive(i: number | null) {
	activeIndex.value = i
	elements.value.forEach((el: StageEl, idx: number) => (el.activated = idx === i))
}

function updateElement(i: number, patch: Partial<StageEl>) {
	Object.assign(elements.value[i], patch)
}

function removeElement(i: number | null) {
	if (i === null || i < 0) return
	elements.value.splice(i, 1)
	setActive(null)
}

// «Око» в списку шарів: тимчасово прибрати шар з макета, не видаляючи його
function toggleHidden(i: number) {
	const el = elements.value[i]
	if (!el) return
	el.hidden = !el.hidden
	// Виділення на невидимому елементі лишало б активними інструменти, які ні на що не діють
	if (el.hidden && activeIndex.value === i) setActive(null)
}

// Клік по рядку схованого шару повертає його на макет — інакше рядок був би «мертвим»
function onLayerClick(i: number) {
	if (elements.value[i]?.hidden) return toggleHidden(i)
	setActive(i)
}

// Правка напису зі списку шарів. Схований шар спершу повертаємо на макет — інакше
// результат правок нікуди не видно.
function editLayerText(i: number) {
	if (elements.value[i]?.hidden) toggleHidden(i)
	openTextEdit(i)
}

// Скачування фото шару — лише менеджеру, що відкрив макет замовлення з адмінки.
// Покупець, який править свій макет із кошика, цієї кнопки не бачить.
const canDownloadLayers = computed(() => !!designDir.value && !cartItem.value)

// Файл зветься {id макета}_{номер шару}: у теці менеджера одразу видно, з якого замовлення
// й шару кожне фото. blob:/data: читаються напряму, а сховище віддає без CORS — звідти
// беремо base64 через API (той самий обхід, що й для canvas).
async function downloadLayer(i: number) {
	const el = elements.value[i]
	if (el?.type !== 'image' || !el.url) return

	try {
		let res = await fetch(el.url).catch(() => null)
		if (!res?.ok) {
			const b64 = await imageB64(el.url)
			if (!b64) throw new Error(`не вдалося завантажити зображення: ${el.url}`)
			res = await fetch(b64)
		}
		const blob = await res.blob()
		const ext = (blob.type.match(/^image\/(\w+)/)?.[1] || 'jpg').replace('jpeg', 'jpg')

		const a = document.createElement('a')
		a.href = URL.createObjectURL(blob)
		a.download = `${designDir.value?.split('_')[0]}_${i + 1}.${ext}`
		a.click()
		setTimeout(() => URL.revokeObjectURL(a.href), 1000)
	} catch (e) {
		console.error('[printcase] downloadLayer', e)
		notify('error', t('printcase.layerDownloadFailed'))
	}
}

// Додаємо зображення (вписане в сцену, по центру). origin — звідки воно взялося: саме він
// іде в маніфест, бо url буває тимчасовим (blob:/base64) і після перезавантаження мертвий.
function pushImage(src: string, origin?: string): Promise<void> {
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			const aspect = img.width / img.height
			const width = Math.min(STAGE_W, STAGE_H * aspect)
			const height = Math.min(STAGE_H, STAGE_W / aspect)

			elements.value.push({
				type: 'image',
				url: src,
				origin,
				x: (STAGE_W - width) / 2,
				y: (STAGE_H - height) / 2,
				width,
				height,
				rotation: 0,
				activated: false,
			})
			setActive(elements.value.length - 1)
			resolve()
		}
		img.onerror = () => resolve()
		img.src = src
	})
}

// Файл з диска, буфера чи перетягування. Спершу зменшуємо: телефон дає 3000–4000 px, а друк
// рендериться у 800×1600, тож усе понад 2000 px — це лише вага. На макет кладемо блобом:
// canvas працює з ним так само, як із data:URL (свій origin, полотно не «отруюється»),
// але пам'ять не тримає мегабайтні рядки, і чернетка в IndexedDB виходить компактною.
async function pushImageFile(file: File) {
	try {
		const asset = await design.prepareImage(file)
		await pushImage(asset.url, `sha:${asset.name}`)
	} catch {
		notify('error', t('printcase.dropOnlyImages'))
	}
}

async function addImagesFromDisk(e: Event) {
	const input = e.target as HTMLInputElement
	const files = Array.from(input.files || [])
	input.value = ''
	// Послідовно — щоб порядок шарів збігався з порядком вибраних файлів
	for (const file of files) await pushImageFile(file)
}

// Картинки з DataTransfer — і буфер обміну, і перетягування дають той самий об'єкт.
// items надійніші за files у paste-подіях, тож беремо їх першими.
function imageFilesFrom(dt: DataTransfer | null | undefined): File[] {
	if (!dt) return []
	const fromItems = Array.from(dt.items || [])
		.filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
		.map((it) => it.getAsFile())
		.filter((f): f is File => !!f)
	return fromItems.length ? fromItems : Array.from(dt.files || []).filter((f) => f.type.startsWith('image/'))
}

// Без моделі малювати нікуди — ведемо до її вибору, як заблоковані кнопки
async function addImageFiles(files: File[]) {
	if (!model.value) {
		modelModalOpen.value = true
		return
	}
	for (const file of files) await pushImageFile(file)
}

// ---------- Буфер обміну ----------
// Довший текст на чохлі перетворюється на нечитабельну смужку — краще чесно сказати,
// ніж мовчки додати шар, який доведеться видаляти
const PASTE_TEXT_MAX = 60

// Вставка не має заважати звичайному введенню: полям, модалкам
function pasteBlocked(target: EventTarget | null) {
	if (textModalOpen.value || modelModalOpen.value || libraryOpen.value) return true
	const tgt = target as HTMLElement | null
	return !!tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)
}

// Текст із буфера або з перетягування стає написом. Сцена малює один рядок, тож переноси
// склеюємо. false — вставляти нема чого (порожньо або посилання), викликач вирішує сам.
function addTextFrom(raw: string): boolean {
	const text = raw.replace(/\s+/g, ' ').trim()
	// Посилання й data:URL на чохлі — майже завжди випадкова вставка, а не задум
	if (!text || /^(data:|\w+:\/\/)/i.test(text)) return false

	if (text.length > PASTE_TEXT_MAX) {
		notify('info', t('printcase.pasteTextLong', { max: PASTE_TEXT_MAX }))
		return true
	}
	if (!model.value) {
		modelModalOpen.value = true
		return true
	}
	pushText({ ...TEXT_DEFAULTS, text })
	return true
}

// Ctrl+V: скрін чи скопійоване фото одразу на чохол, коротка фраза — написом.
// Слухаємо документ: у конструкторі немає елемента, який тримає фокус.
function onPaste(e: ClipboardEvent) {
	if (pasteBlocked(e.target)) return

	// getAsFile() валідний лише синхронно, поки подія не завершилась
	const files = imageFilesFrom(e.clipboardData)
	if (files.length) {
		e.preventDefault()
		addImageFiles(files)
		return
	}

	if (addTextFrom(e.clipboardData?.getData('text/plain') || '')) e.preventDefault()
}

// ---------- Перетягування файлів ----------
const dragOver = ref(false)
// dragleave стріляє й на переходах між дочірніми елементами — рахуємо вкладеність
let dragDepth = 0

// Тягнуть саме файли, а не виділений текст чи картинку з іншої вкладки
function hasFiles(dt: DataTransfer | null) {
	return !!dt && Array.from(dt.types).includes('Files')
}

function onDragEnter(e: DragEvent) {
	if (!hasFiles(e.dataTransfer)) return
	dragDepth++
	dragOver.value = true
}

function onDragOver(e: DragEvent) {
	if (!hasFiles(e.dataTransfer) || !e.dataTransfer) return
	e.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
	if (--dragDepth <= 0) {
		dragDepth = 0
		dragOver.value = false
	}
}

function onDrop(e: DragEvent) {
	dragDepth = 0
	dragOver.value = false

	const files = imageFilesFrom(e.dataTransfer)
	if (files.length) return addImageFiles(files)

	// Перетягнутий текст стає написом — так само, як Ctrl+V
	if (addTextFrom(e.dataTransfer?.getData('text/plain') || '')) return

	// Картинка, перетягнена з іншої вкладки, приходить посиланням, а не файлом: намалювати
	// її вийшло б, а надрукувати — ні (чужий домен не дає CORS), тож просимо саме файл
	notify('error', t('printcase.dropOnlyImages'))
}

// Картинка з галереї лежить у сховищі — у маніфест іде її шлях, а не самі байти
function addImageFromLibrary(src: string) {
	const m = src.match(/library\/([^/]+\/[^/]+)$/)
	pushImage(src, m ? `lib:${m[1]}` : undefined)
}

// ---------- Текст ----------
const fonts = [
	'Rubik Mono One', 'Roboto', 'Ruslan Display', 'Rubik Wet Paint', 'Rubik', 'Russo One', 'Bad Script',
	'Stalinist One', 'Lobster', 'Pacifico', 'Rubik Bubbles', 'Pangolin', 'Montserrat', 'Quicksand', 'Merriweather',
	'Oswald', 'Comfortaa', 'Marmelad', 'Caveat', 'Cormorant', 'Lora', 'Amatic SC', 'Neucha', 'Poiret One',
]

// Готовність таблиці шрифтів. Поки вона не розібрана, document.fonts про ці шрифти ще нічого
// не знає — і load() повернеться порожнім, нічого не дочекавшись (див. ensureFonts)
let fontsCssReady: Promise<void> = Promise.resolve()

// Стартові налаштування нового напису — і для модалки, і для вставки з буфера
const TEXT_DEFAULTS: TextForm = { text: '', color: '#000000', font: 'Roboto', bold: false, italic: false, underline: false }

const textModalOpen = ref(false)
const textEditMode = ref(false)
const textForm = ref<TextForm>({ ...TEXT_DEFAULTS })

function openTextAdd() {
	textEditMode.value = false
	textForm.value = { ...TEXT_DEFAULTS }
	textModalOpen.value = true
}

function openTextEdit(i: number | null) {
	if (i === null) return
	const el = elements.value[i]
	if (!el || el.type !== 'text') return
	setActive(i)
	textEditMode.value = true
	textForm.value = {
		text: el.text || '',
		color: el.color || '#000000',
		font: el.font || 'Roboto',
		bold: !!el.bold,
		italic: !!el.italic,
		underline: !!el.underline,
	}
	textModalOpen.value = true
}

// Новий напис по центру макета
function pushText(form: TextForm) {
	// Ширина тексту ~ пропорційно довжині
	const height = 44
	const width = Math.min(STAGE_W - 20, Math.max(120, form.text.length * height * 0.55))

	elements.value.push({
		type: 'text',
		...form,
		x: (STAGE_W - width) / 2,
		y: (STAGE_H - height) / 2,
		width,
		height,
		rotation: 0,
		activated: false,
	})
	setActive(elements.value.length - 1)
}

function saveText(form: TextForm) {
	if (textEditMode.value && activeIndex.value !== null) {
		const el = elements.value[activeIndex.value]
		if (el?.type === 'text') Object.assign(el, form)
		return
	}
	pushText(form)
}

// ---------- Керування ----------
const backgroundColor = ref('#FFFFFF')

// Прозорий фон: чохол лишається прозорим там, де немає малюнка. У друк тоді йде png —
// jpeg прозорості не має в принципі, тож формат обирає саме цей вибір.
const transparentBg = ref(false)

// Те, чим реально малюємо: і на сцені, і на полотні друку, і в маніфесті
const bgValue = computed(() => (transparentBg.value ? 'transparent' : backgroundColor.value))

// Готові фони. Це дані макета (йдуть у друк), а не оформлення інтерфейсу, тож живуть тут,
// а не серед токенів теми. Набір закриває майже всі замовлення в один тап: нейтральні,
// потім теплі й холодні — решту дає «свій колір».
const BG_PRESETS = [
	'#FFFFFF', '#F3E9DC', '#D9D9DE', '#8E8E93', '#111111',
	'#FFD166', '#FF7A00', '#E11D2E', '#EF476F', '#B197FC',
	'#4E6BFF', '#18C5C0', '#2FBF71',
] as const

const bgPickerOpen = ref(false)

// Нативний вибір кольору віддає #rrggbb у нижньому регістрі — порівнюємо без нього
const isSameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// «Свій колір» підсвічується тільки тоді, коли поточний фон не збігається з жодним пресетом
const isCustomBg = computed(
	() => !transparentBg.value && !BG_PRESETS.some((c) => isSameColor(c, backgroundColor.value))
)

// Один вхід для всіх варіантів фону: 'transparent' або #rrggbb.
// Палітру після вибору не закриваємо — кольори зазвичай перебирають кілька разів,
// дивлячись на макет; закриє клік поза нею, ✕ або Esc.
function setBg(value: string) {
	transparentBg.value = value === 'transparent'
	if (value !== 'transparent') backgroundColor.value = value
}

// Нативний вибір кольору: фон міняється на кожен рух повзунка, ще до закриття діалога
function setBgFromInput(e: Event) {
	setBg((e.target as HTMLInputElement).value)
}

// ---------- Фон кодом ----------
// Поле під палітрою: у замовленнях часто є точний фірмовий колір, і його простіше
// вписати, ніж ловити повзунками. Символ «#» намальований окремо — у полі лише код.
const bgHex = ref(backgroundColor.value.replace('#', '').toUpperCase())

// Приймаємо і повний код, і скорочений (#abc). Чистимо ввід одразу, щоб у полі
// не лишалось нічого, що не є кодом (наприклад, «#» зі вставленого буфера).
function applyBgHex() {
	const raw = bgHex.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase()
	bgHex.value = raw
	const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw
	if (full.length === 6) setBg(`#${full}`)
}

// Незавершений код (1–2 символи) на виході з поля повертаємо до чинного фону
function resetBgHex() {
	bgHex.value = backgroundColor.value.replace('#', '').toUpperCase()
}

// Фон могли змінити пресетом чи піпеткою — підтягуємо код, але не переписуємо
// скорочений запис, який щойно ввели самі (#abc уже дорівнює поточному кольору)
watch(backgroundColor, (v) => {
	const cur = bgHex.value
	const full = cur.length === 3 ? cur.replace(/./g, (c) => c + c) : cur
	if (full.toLowerCase() === v.replace('#', '').toLowerCase()) return
	bgHex.value = v.replace('#', '').toUpperCase()
})

function zoomIn() { scaleActive(1.1) }
function zoomOut() { scaleActive(0.9) }

function scaleActive(factor: number) {
	if (activeIndex.value === null) return
	const el = elements.value[activeIndex.value]
	const cx = el.x + el.width / 2
	const cy = el.y + el.height / 2
	el.width *= factor
	el.height *= factor
	el.x = cx - el.width / 2
	el.y = cy - el.height / 2
}

function rotate(deg: number) {
	if (activeIndex.value === null) return
	elements.value[activeIndex.value].rotation += deg
}

function layerUp() {
	const i = activeIndex.value
	if (i === null || i >= elements.value.length - 1) return
	;[elements.value[i], elements.value[i + 1]] = [elements.value[i + 1], elements.value[i]]
	setActive(i + 1)
}

function layerDown() {
	const i = activeIndex.value
	if (i === null || i <= 0) return
	;[elements.value[i], elements.value[i - 1]] = [elements.value[i - 1], elements.value[i]]
	setActive(i - 1)
}

// Зміна шару конкретного елемента зі списку шарів (вище = ближче до глядача)
function moveLayerUp(i: number) {
	if (i < 0 || i >= elements.value.length - 1) return
	;[elements.value[i], elements.value[i + 1]] = [elements.value[i + 1], elements.value[i]]
	setActive(i + 1)
}

function moveLayerDown(i: number) {
	if (i <= 0) return
	;[elements.value[i], elements.value[i - 1]] = [elements.value[i - 1], elements.value[i]]
	setActive(i - 1)
}

// Клавіатура: стрілки + Delete (ігноруємо, коли друкуємо в полі або відкрита модалка)
function onKeydown(e: KeyboardEvent) {
	// Esc закриває палітру фону раніше за все інше — вона поверх макета
	if (e.key === 'Escape' && bgPickerOpen.value) {
		bgPickerOpen.value = false
		return
	}
	if (activeIndex.value === null) return
	if (textModalOpen.value || modelModalOpen.value || libraryOpen.value) return
	const tgt = e.target as HTMLElement | null
	if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return

	const el = elements.value[activeIndex.value]
	const step = 10

	switch (e.key) {
		case 'ArrowUp': el.y -= step; break
		case 'ArrowDown': el.y += step; break
		case 'ArrowLeft': el.x -= step; break
		case 'ArrowRight': el.x += step; break
		case 'Delete': removeElement(activeIndex.value); break
		default: return
	}
	e.preventDefault()
}

// Зняти виділення при кліку будь-де поза конструктором (поза білим блоком + інструментами).
// Контроли, що працюють з виділенням (редагування тексту, список шарів), глушать pointerdown.
function onDocPointerDown(e: PointerEvent) {
	// Палітра фону глушить pointerdown у себе, тож усе, що сюди дійшло, — клік поза нею
	bgPickerOpen.value = false
	if (activeIndex.value === null) return
	if (textModalOpen.value || modelModalOpen.value || libraryOpen.value) return
	if (editorRef.value && !editorRef.value.contains(e.target as Node)) setActive(null)
}

onMounted(() => {
	window.addEventListener('keydown', onKeydown)
	document.addEventListener('paste', onPaste)
	document.addEventListener('pointerdown', onDocPointerDown)

	// Підключаємо шрифти для тексту
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = `https://fonts.googleapis.com/css2?family=${fonts.map((f) => f.replace(/ /g, '+')).join('&family=')}&display=swap`
	fontsCssReady = new Promise<void>((resolve) => {
		link.onload = () => resolve()
		link.onerror = () => resolve() // немає шрифтів — малюємо запасними, але не зависаємо
	})
	document.head.appendChild(link)

	// Що показати на старті. Порядок не випадковий: правка вже оформленого макета важливіша
	// за все інше, готовий дизайн із посилання — за власну чернетку.
	const np = route.query.neo_print_id
	const alias = Array.isArray(np) ? np[0] : np

	if (designDir.value) openDesign(designDir.value)
	else if (alias) loadNeoPrint(alias)
	else restoreDraft()
})

onUnmounted(() => {
	window.removeEventListener('keydown', onKeydown)
	document.removeEventListener('paste', onPaste)
	document.removeEventListener('pointerdown', onDocPointerDown)
})

async function loadNeoPrint(alias: string) {
	try {
		const res = await $fetch<{ base64Image?: string }>(`${config.public.urlApi}attributes/image_b64/${alias}`, {
			query: { type: 'template' },
		})
		if (res?.base64Image) {
			pushImage(res.base64Image, `neo:${alias}`)
			return
		}
	} catch { /* fallback нижче */ }
	// Саме оригінальний jpg: полотно конструктора йде у друк, webp дав би друге стиснення
	pushImage(url.neoprintTemplateSource(alias), `neo:${alias}`)
}

// ---------- Чернетка та збережений макет ----------
// Маніфест поточного макета: те саме, що на сцені, але у вигляді, придатному і для сховища,
// і для IndexedDB (координати лишаються в координатах сцени 400×800)
function currentState() {
	return design.toState(elements.value, bgValue.value, model.value?.alias || '')
}

// Фон із маніфесту: або 'transparent', або звичайний колір
function applyBg(bg?: string) {
	transparentBg.value = bg === 'transparent'
	backgroundColor.value = bg && bg !== 'transparent' ? bg : '#FFFFFF'
}

// Чернетка збереглась і відновлена — показуємо смужку з «почати заново».
// Мовчки підміняти макет не можна: людина могла прийти робити новий чохол.
const restored = ref(false)

// Автозбереження: пишемо на кожну зміну, запис відкладений усередині composable.
// У режимі правки замовлення чернетку клієнта не чіпаємо — це чужий макет.
watch(
	[elements, backgroundColor, transparentBg],
	() => {
		if (designDir.value || !model.value) return
		// Маніфест зберемо вже при самому записі — watch спрацьовує на кожен рух шару
		draft.save(model.value.alias, currentState, model.value, design.assets)
	},
	{ deep: true }
)

// Повернення на сторінку: макет має бути там, де його лишили (30 днів)
async function restoreDraft() {
	if (elements.value.length) return

	const rec = model.value ? await draft.load(model.value.alias) : await draft.latest()
	if (!rec?.state?.els?.length) return

	const { elements: els } = await design.toElements(rec.state, undefined, rec.assets)
	if (!els.length) return

	elements.value = els
	applyBg(rec.state.bg)
	restored.value = true

	// Чернетка з хаба знає свою модель — підтягуємо разом із нею і контент сторінки
	if (!model.value && rec.model?.alias) {
		model.value = rec.model
		loadModelPage(rec.model.alias)
	}
}

// Чистий макет: і «почати заново» у смужці відновлення, і кнопка очищення в шарах,
// і стан після того, як чохол поїхав у кошик
function resetStage() {
	elements.value = []
	setActive(null)
	applyBg()
	restored.value = false
	clearArmed.value = false
	if (model.value) draft.remove(model.value.alias)
}

// Очищення — у два кліки: намальоване не відновиш, а кнопка стоїть просто над списком шарів
const clearArmed = ref(false)
let clearTimer: ReturnType<typeof setTimeout> | null = null

function onClearClick() {
	if (clearTimer) clearTimeout(clearTimer)

	if (clearArmed.value) return resetStage()

	clearArmed.value = true
	clearTimer = setTimeout(() => (clearArmed.value = false), 3000)
}

// Посилання «Редагувати макет» може прилетіти й тоді, коли конструктор УЖЕ відкритий:
// слайдер-кошик живе поверх цієї ж сторінки, тож міняється лише ?design=, компонент не
// перемонтовується — і onMounted, який вантажить макет, більше не спрацює.
watch(designDir, (dir, prev) => {
	if (dir) openDesign(dir)
	else if (prev) resetStage() // вийшли з правки — далі малюємо з чистого аркуша
})

// Відкриття збереженого макета на правку (посилання з адмінки або з кошика)
async function openDesign(dir: string) {
	const state = await design.load(dir).catch(() => null)
	if (!state) {
		// Сцену чистимо: інакше «Зберегти зміни» записало б у це замовлення те, що випадково
		// лишилось на макеті від попередньої роботи. Порожня сцена ще й глушить кнопку.
		elements.value = []
		setActive(null)
		restored.value = false
		designMissing.value = 0
		notify('error', t('printcase.designGone'))
		return
	}

	const { elements: els, missing } = await design.toElements(state, dir)
	elements.value = els
	applyBg(state.bg)
	designMissing.value = missing
	restored.value = false // на екрані вже не чернетка, а збережений макет
}

// ---------- Canvas-генерація ----------
const generating = ref(false)

function loadImg(src: string, cors = true): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		// data: і blob: — свій origin: полотно вони не «отруюють», а crossOrigin тут зайвий
		if (cors && !src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}

// Сховище віддається без CORS-заголовків, тож crossOrigin-завантаження звідти завжди падає
// (а без crossOrigin картинка «отруїла» б canvas і toDataURL кинув би SecurityError).
// Тому для таких URL беремо base64 через API.
async function imageB64(src: string): Promise<string | null> {
	// Бібліотека конструктора
	const lib = src.match(/printcase\/library\/([^/]+)\/([^/]+)$/)
	if (lib) {
		const res = await $fetch<{ base64Image?: string }>(
			`${config.public.urlApi}printcase/get_image_b64/${lib[2]}/library/${lib[1]}`
		).catch(() => null)
		return res?.base64Image || null
	}
	// Шаблон готового дизайну (?neo_print_id=)
	const tpl = src.match(/images\/templates\/([^/]+)\.\w+$/)
	if (tpl) {
		const res = await $fetch<{ base64Image?: string }>(
			`${config.public.urlApi}attributes/image_b64/${tpl[1]}`,
			{ query: { type: 'template' } }
		).catch(() => null)
		return res?.base64Image || null
	}
	return null
}

// Завантаження зображення з обходом CORS через бекенд
async function loadElementImage(src: string): Promise<HTMLImageElement> {
	try {
		return await loadImg(src)
	} catch {
		const b64 = await imageB64(src)
		if (b64) return loadImg(b64, false)
		throw new Error(`не вдалося завантажити зображення: ${src}`)
	}
}

async function renderCanvas(width: number, withMask: boolean): Promise<string> {
	const k = width / STAGE_W
	const height = STAGE_H * k

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!

	// Фон. Прозорий не малюємо взагалі — полотно й так порожнє, а альфа має дійти до друку
	if (!transparentBg.value) {
		ctx.fillStyle = backgroundColor.value
		ctx.fillRect(0, 0, width, height)
	}

	// Елементи в порядку шарів (сховані «оком» — повз)
	for (const el of visibleElements.value) {
		ctx.save()
		ctx.translate((el.x + el.width / 2) * k, (el.y + el.height / 2) * k)
		ctx.rotate((el.rotation * Math.PI) / 180)

		if (el.type === 'image' && el.url) {
			const img = await loadElementImage(el.url)
			ctx.drawImage(img, (-el.width / 2) * k, (-el.height / 2) * k, el.width * k, el.height * k)
		} else if (el.type === 'text') {
			const fontSize = el.height * k
			ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${fontSize}px "${el.font}", sans-serif`
			ctx.fillStyle = el.color || '#000'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(el.text || '', 0, 0)

			if (el.underline) {
				const tw = ctx.measureText(el.text || '').width
				ctx.strokeStyle = el.color || '#000'
				ctx.lineWidth = Math.max(1, fontSize / 16)
				ctx.beginPath()
				ctx.moveTo(-tw / 2, fontSize * 0.42)
				ctx.lineTo(tw / 2, fontSize * 0.42)
				ctx.stroke()
			}
		}
		ctx.restore()
	}

	// Маска поверх (тільки для превʼю) — вписуємо як background-size: cover на сцені.
	// Розтяг на весь кадр спотворював би маску: дефолтна квадратна (1200×1200), а сцена 1:2,
	// тож чохол у превʼю кошика виходив сплюснутим з боків.
	if (withMask && maskUrl.value) {
		const mask = await loadImg(maskUrl.value, false)
		const cover = Math.max(width / mask.width, height / mask.height)
		const mw = mask.width * cover
		const mh = mask.height * cover
		ctx.drawImage(mask, (width - mw) / 2, (height - mh) / 2, mw, mh)
	}

	// png лише коли фон прозорий: він важить у рази більше, тож для звичайного макета
	// це була б чиста витрата місця й трафіку
	return transparentBg.value ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85)
}

// Шрифти підключаються <link>-ом і вантажаться асинхронно. Поки людина малює, вони встигають,
// а от макет, відкритий з адмінки, можна зберегти за секунду — і canvas мовчки намалював би
// написи запасним шрифтом. Тому перед рендером чекаємо саме ті накреслення, що є на макеті.
async function ensureFonts() {
	await fontsCssReady

	const specs = new Set<string>(
		visibleElements.value
			.filter((el: StageEl) => el.type === 'text')
			.map((el: StageEl) => `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}44px "${el.font || 'Roboto'}"`)
	)
	await Promise.all([...specs].map((spec) => document.fonts.load(spec).catch(() => {})))
}

// Рендер обох картинок + збереження макета одним запитом.
// id обирає САМ СЕРВЕР: раніше він генерувався тут із Date.now(), і два замовлення в одну
// секунду перезаписували друк одне одному. Разом із картинками йде маніфест — фото клієнта
// доливаються у фоні, кнопка кошика на них не чекає.
async function generateAndUpload(): Promise<{ id: number; dir: string; preview: string; source: string }> {
	// Знімаємо виділення, щоб рамки не потрапили в макет
	setActive(null)
	await ensureFonts()

	const sourceData = await renderCanvas(800, false)
	const previewData = await renderCanvas(400, true)

	const state = currentState()
	const res = await design.save({ state, preview: previewData, source: sourceData })
	design.uploadAssets(res.dir, state)

	return {
		id: res.id,
		dir: res.dir,
		preview: config.public.urlStorage + res.preview,
		source: config.public.urlStorage + res.source,
	}
}

// Збереження правки з адмінки: та сама папка й той самий id, тож у замовленні нічого міняти
// не треба — друк і CaseShop читають той самий source_{id}.jpg, уже з новим вмістом
async function saveDesignEdit() {
	if (!designDir.value || !visibleElements.value.length) return

	generating.value = true
	try {
		setActive(null)
		await ensureFonts()

		const state = currentState()
		const res = await design.save({
			state,
			preview: await renderCanvas(400, true),
			source: await renderCanvas(800, false),
			dir: designDir.value,
		})
		await design.uploadAssets(designDir.value, state)

		if (cartItem.value) {
			// Шлях міг змінитись разом із фоном (прозорий зберігається як png), тож у кошику
			// оновлюємо обидва посилання. А прев'ю під тим самим імʼям просимо браузер
			// перечитати — інакше там лишилась би стара картинка з кешу.
			cartItem.value.product.image = config.public.urlStorage + res.preview
			cartItem.value.printcase = config.public.urlStorage + res.source
			fetch(cartItem.value.product.image, { cache: 'reload', mode: 'no-cors' }).catch(() => {})

			notify('success', t('printcase.designSavedCart'))
			openCart(false)
		} else {
			notify('success', t('printcase.designSaved'))
		}
	} catch (e) {
		console.error('[printcase] saveDesignEdit', e)
		notify('error', t('message.printcaseFailed'))
	}
	generating.value = false
}

// Кнопка під ціною: домалювати до вже оформленого замовлення (?order_id=), покласти в кошик
// або — коли друк на модель лише під передзамовлення — оформити його телефоном
function order() {
	if (designDir.value) return saveDesignEdit()
	if (orderId.value) return addToExistingOrder()
	if (modelStock.value === 'pre_order') return preOrder()
	return addToCart()
}

// Додати в кошик
async function addToCart() {
	if (!model.value || !visibleElements.value.length) return

	generating.value = true
	try {
		const { id, dir, preview, source } = await generateAndUpload()

		cart.add({
			product: {
				id,
				// Посилання з кошика веде на сторінку конструктора цієї моделі
				alias: model.value.alias,
				alias_cat: 'printcase',
				title: `ІНДИВІДУАЛЬНИЙ чохол для ${model.value.name}`,
				price,
				price_old: priceOld,
			},
			attribute: 0,
			image: preview,
			printcase: source,
			// Клік по товару в кошику відкриє цей самий макет на правку
			printcaseDir: dir,
			categoryId: model.value.id,
		})

		// Чохол поїхав у кошик — конструктор чистимо: макет тепер живе там (і правиться
		// звідти кнопкою «Редагувати макет»), а лишати його на сцені означало б плодити
		// випадкові дублі. Чернетка теж більше не потрібна — сирці вже на сервері.
		resetStage()

		// Як і у звичайного товару: слайдер-кошик замість тосту й переходу на сторінку кошика
		openCart()
	} catch (e) {
		console.error('[printcase] addToCart', e)
		notify('error', t('message.printcaseFailed'))
	}
	generating.value = false
}

// Передзамовлення: у кошик макет не кладемо — беремо телефон і одразу оформлюємо замовлення.
// Рендер і вивантаження макета робимо вже в модалці (buildItem), щоб не малювати марно,
// якщо людина передумає вводити номер.
function preOrder() {
	if (!model.value || !visibleElements.value.length) return

	openPreOrder({
		price,
		buildItem: async () => {
			generating.value = true
			try {
				const { id, preview, source } = await generateAndUpload()
				return {
					product_id: id,
					title: `ІНДИВІДУАЛЬНИЙ чохол для ${model.value!.name}`,
					attribute_id: 0,
					count: 1,
					price,
					discount: 0,
					image_file: preview,
					printcase: source,
					category_id: model.value!.id,
				}
			} finally {
				generating.value = false
			}
		},
	})
}

// Додати до існуючого замовлення (?order_id=)
async function addToExistingOrder() {
	if (!model.value || !visibleElements.value.length || !orderId.value) return

	generating.value = true
	try {
		const { preview, source } = await generateAndUpload()

		await $fetch(config.public.urlApi + 'orders/add_order_printcase', {
			query: {
				order_item: JSON.stringify({
					title: `ЧОХОЛ для ${model.value.name}`,
					count: 1,
					price,
					printcase: source,
					image_file: preview,
					order_id: orderId.value,
					product_id: 0,
					attribute_id: 0,
					category_id: model.value.id,
				}),
			},
		})

		notify('success', `OK: + № ${orderId.value}`)
	} catch (e) {
		console.error('[printcase] addToExistingOrder', e)
		notify('error', t('message.printcaseFailed'))
	}
	generating.value = false
}

// ---------- Тексти сторінки ----------
const isModelPage = computed(() => !!category.value)

// H1: назва статті з адмінки має пріоритет (нею керували H1 на старому сайті), далі — i18n.
// Для хаба це не «Конструктор чохлів» (назва інструмента), а сама послуга: хаб тепер цілиться
// в загальні запити, бо модельні забрали свої сторінки. printcase.constructor лишається
// коротким лейблом для меню, крихт і кнопок.
const h1 = computed(() => {
	if (data.value?.articleTitle) return data.value.articleTitle
	return isModelPage.value ? t('printcase.seo.h1', { model: names.value.full }) : t('printcase.seo.hubH1')
})

// Лід над конструктором: коротко про послугу. На сторінці моделі — з її назвою,
// тож навіть без статті сторінка має власний осмислений текст.
const lead = computed(() =>
	isModelPage.value
		? t('printcase.seo.lead', { model: names.value.alt_, price })
		: t('printcase.seo.hubLead', { price })
)

const faqItems = computed(() => {
	if (!isModelPage.value) return []
	const p = { model: names.value.full, model_short: names.value.short_, model_alt: names.value.alt_, price, priceOld }
	return [1, 2, 3, 4, 5].map((i) => ({
		q: t(`printcase.seo.faq.q${i}`, p),
		a: t(`printcase.seo.faq.a${i}`, p),
	}))
})

const breadcrumbs = computed(() => {
	if (!category.value) return [{ title: t('printcase.constructor') }]

	const crumbs: { title: string; url?: string }[] = []
	if (category.value.brend) {
		crumbs.push({ title: category.value.brend.title, url: url.category(category.value.brend.alias) })
	}
	crumbs.push({
		title: category.value.brend ? names.value.short_ : names.value.full,
		url: url.category(category.value.alias),
	})
	crumbs.push({ title: t('printcase.constructor') })
	return crumbs
})

// ---------- SEO ----------
// Сторінка моделі йде в індекс лише коли їй є що сказати: модель підтримує друк І
// є текст (своя стаття або шаблон із підставленою моделлю). Інакше noindex, follow —
// сторінка працює й лишається точкою обходу, але в індексі не плодить порожніх дублів.
// canonical завжди самопосилальний: canonical на /printcase був би вказівкою на інший
// контент, і пошуковики його б однаково проігнорували.
const indexable = computed(() => !!category.value?.printcase && !!articleHtml.value)

const shareImage = computed(() => url.absolute('/images/printcase/printcase_product.jpg'))

usePageSeo({
	title: () =>
		data.value?.metaTitle ||
		(isModelPage.value ? t('printcase.seo.metaTitle', { model: names.value.full }) : t('printcase.seo.hubH1')),
	description: () =>
		data.value?.metaDescription ||
		(isModelPage.value
			? t('printcase.seo.metaDescription', { model: names.value.full, price })
			: t('printcase.seo.hubMetaDescription', { price })),
	image: () => shareImage.value,
	// Службові режими (домалювати до замовлення, правка макета з адмінки) в індексі не потрібні
	noindex: () => (isModelPage.value ? !indexable.value : false) || !!orderId.value || !!designDir.value,
	// URL змінюється без навігації роутера (вибір іншої моделі) — canonical тримаємо на ній
	path: () => url.printcase(model.value?.alias),
	ogType: 'product',
})

// Товар: для пошуковиків і AI це повноцінна позиція зі своєю ціною
useJsonLd(() => ({
	'@context': 'https://schema.org',
	'@type': 'Product',
	name: isModelPage.value
		? t('printcase.seo.productName', { model: names.value.full })
		: t('printcase.seo.productNameHub'),
	description: isModelPage.value
		? t('printcase.seo.metaDescription', { model: names.value.full, price })
		: t('printcase.seo.hubMetaDescription', { price }),
	image: [shareImage.value],
	url: url.absolute(url.printcase(model.value?.alias)),
	...(category.value ? { sku: `PC-${category.value.id}` } : {}),
	brand: { '@type': 'Brand', name: config.public.siteName },
	// Відгуки та зведений рейтинг рівно ті, що показані на цій сторінці: у моделі — її
	// власні (у кожної адреси свої, не дубль), на хабі — усі відгуки конструктора.
	...reviewsJsonLd(reviews.value),
	offers: {
		'@type': 'Offer',
		url: url.absolute(url.printcase(model.value?.alias)),
		priceCurrency: 'UAH',
		price,
		itemCondition: 'https://schema.org/NewCondition',
		availability: 'https://schema.org/InStock',
		...offerShop(config.public.siteUrl as string),
		// Індивідуальний друк поверненню не підлягає (брак — передрук або гроші назад):
		// перекриваємо загальну 14-денну політику магазину
		hasMerchantReturnPolicy: {
			'@type': 'MerchantReturnPolicy',
			applicableCountry: 'UA',
			returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
		},
	},
}))

// Шлях Бренд → Модель → Конструктор: те саме, що у видимих крихтах над заголовком
useBreadcrumbsJsonLd(breadcrumbs)

// Хаб — ще й інструкція: AI-системам це найзрозуміліший опис самої послуги.
// Реєструємо лише на хабі (режим сторінки відомий на момент SSR і далі не змінюється).
if (!isModelPage.value) {
	useJsonLd(() => ({
		'@context': 'https://schema.org',
		'@type': 'HowTo',
		name: t('printcase.seo.howTo.title'),
		totalTime: 'PT5M',
		estimatedCost: { '@type': 'MonetaryAmount', currency: 'UAH', value: price },
		step: [1, 2, 3, 4].map((i) => ({
			'@type': 'HowToStep',
			position: i,
			name: t(`printcase.seo.howTo.step${i}.name`),
			text: t(`printcase.seo.howTo.step${i}.text`),
		})),
	}))
}
</script>

<style scoped>
/* Конструктор — компактна центрована робоча зона (контейнер сайту 1550px завеликий) */
.pc-container {
	max-width: 940px;
}

.pc-title {
	margin-bottom: 10px;
}

.pc-lead {
	margin-bottom: 18px;
	max-width: 760px;
	font-size: 14.5px;
	line-height: 1.55;
	color: var(--text-soft);
}

/* Смужка над конструктором: відновлена чернетка або правка збереженого макета */
.pc-note {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 14px;
	padding: 9px 14px;
	border-radius: var(--radius);
	background: var(--bg-soft);
	border: 1px solid var(--border-light);
	font-size: 13px;
	line-height: 1.4;
	color: var(--text-soft);
}

.pc-note--edit {
	background: var(--accent-soft);
	border-color: var(--accent);
	color: var(--text);
}

.pc-note__btn {
	margin-left: auto;
	font-size: 13px;
	font-weight: 600;
	color: var(--accent);
	text-decoration: underline;
}

.pc-layout {
	display: grid;
	grid-template-columns: minmax(440px, 500px) minmax(0, 1fr);
	gap: 20px;
	align-items: start;
	padding-bottom: 30px;
}

/* Обгортка: білий блок + темна панель впритик (два окремі блоки, не один поверх одного) */
.pc-editor {
	position: relative;
	display: flex;
	align-items: stretch;
	min-width: 0;
}

/* Файл тягнуть над сторінкою: показуємо, куди він ляже. Наскрізний для подій —
   інакше сам оверлей забирав би drop і гасив підсвітку миготінням */
.pc-drop {
	position: absolute;
	inset: 0;
	z-index: 12;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 0 20px;
	text-align: center;
	font-size: 15px;
	font-weight: 700;
	color: var(--on-overlay);
	background: var(--overlay);
	border: 2px dashed var(--accent);
	border-radius: var(--radius-lg);
	pointer-events: none;
}

.pc-drop svg {
	color: var(--accent);
}

/* Білий блок макета — округлює лише ліві кути (правим боком стикається з панеллю) */
.pc-stage-col {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14px;
	background: var(--img-bg);
	border-radius: var(--radius-lg) 0 0 var(--radius-lg);
	box-shadow: var(--shadow-card);
	/* Рамка виділення виходить за межі чохла — обрізаємо її по білому блоку,
	   щоб не лізла на панель інструментів */
	overflow: hidden;
}

/* Темна панель інструментів, вмонтована в білий блок на всю висоту */
.pc-controls-col {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 10px 8px;
	background: var(--bg-card);
	border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
	box-shadow: var(--shadow-card);
}

/* Інструменти — зверху */
.ctrl-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.ctrl-group.is-disabled {
	opacity: 0.4;
	pointer-events: none;
}

.ctrl-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 40px;
	border-radius: var(--radius-sm);
	color: var(--text-soft);
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	transition: all 0.13s;
}

.ctrl-btn:hover {
	background: var(--accent);
	border-color: var(--accent);
	color: var(--on-accent);
	box-shadow: 0 4px 14px var(--accent-glow);
}

.ctrl-btn--danger:hover {
	background: var(--danger);
	border-color: var(--danger);
	color: var(--on-overlay);
	box-shadow: none;
}

/* Фон — внизу панелі. Обгортка тримає поповер прив'язаним до кнопки */
.ctrl-bg-wrap {
	position: relative;
	margin-top: auto;
}

.ctrl-bg {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 3px;
	width: 42px;
	padding: 6px 0 4px;
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
	border: 1px solid var(--border-light);
	cursor: pointer;
	transition: border-color 0.15s;
}

.ctrl-bg:hover,
.ctrl-bg.is-open {
	border-color: var(--accent);
}

.ctrl-bg.is-open {
	background: var(--accent-soft);
}

/* Спектральний обідець навколо поточного кольору — однозначний сигнал «тут вибирають колір» */
.ctrl-bg__ring {
	display: flex;
	padding: 3px;
	border-radius: 50%;
	background: var(--color-wheel);
	transition: transform 0.3s;
}

.ctrl-bg:hover .ctrl-bg__ring {
	transform: rotate(120deg) scale(1.08);
}

/* Поки на макеті нічого немає — обідець сам себе показує обертанням */
.ctrl-bg.is-hint .ctrl-bg__ring {
	animation: bg-ring-spin 9s linear infinite;
}

@keyframes bg-ring-spin {
	to {
		transform: rotate(360deg);
	}
}

.ctrl-bg__swatch {
	width: 22px;
	height: 22px;
	border-radius: 50%;
	border: 2px solid var(--bg-elevated);
	pointer-events: none;
}

.ctrl-bg__label {
	font-size: 9.5px;
	font-weight: 700;
	line-height: 1;
	color: var(--text-muted);
	pointer-events: none;
}

.ctrl-bg.is-open .ctrl-bg__label {
	color: var(--accent);
}

/* Прозорість показуємо тим самим шаховим візерунком, що й у графічних редакторах —
   пояснювати словами не доводиться */
.ctrl-bg__swatch.is-transparent,
.bg-sw--transparent {
	background-color: #fff;
	background-image:
		linear-gradient(45deg, #c8c8c8 25%, transparent 25%),
		linear-gradient(-45deg, #c8c8c8 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, #c8c8c8 75%),
		linear-gradient(-45deg, transparent 75%, #c8c8c8 75%);
	background-size: 8px 8px;
	background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

/* ----- Палітра фону ----- */
/* Затемнення потрібне лише нижній шторці на телефоні — на десктопі це звичайний поповер */
.bg-scrim {
	display: none;
}

.bg-pop {
	position: absolute;
	right: calc(100% + 10px);
	bottom: 0;
	z-index: 14;
	width: 246px;
	padding: 12px;
	background: var(--bg-card);
	border: 1px solid var(--border-light);
	border-radius: var(--radius);
	box-shadow: var(--shadow-pop);
	animation: bg-pop-in 0.14s ease-out;
}

@keyframes bg-pop-in {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
}

.bg-pop__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 11px;
}

.bg-pop__title {
	font-size: 13px;
	font-weight: 700;
	color: var(--text);
}

.bg-pop__close {
	display: flex;
	color: var(--text-muted);
	transition: color 0.13s;
}

.bg-pop__close:hover {
	color: var(--accent);
}

.bg-pop__grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 8px;
}

.bg-sw {
	position: relative;
	aspect-ratio: 1;
	border-radius: 50%;
	border: 1px solid var(--border-light);
	cursor: pointer;
	transition: transform 0.13s;
}

.bg-sw:hover {
	transform: scale(1.12);
}

/* Вибраний фон — подвійне кільце: просвіт кольором панелі, зовні акцент. На відміну від
   галочки, читається однаково на білому, чорному й на шахівниці */
.bg-sw.is-active {
	box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 4px var(--accent);
}

/* Свій колір: спектр по колу, всередині — сам відтінок, коли він не з пресетів */
.bg-sw--custom {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-wheel);
}

.bg-sw--custom input {
	position: absolute;
	inset: 0;
	opacity: 0;
	cursor: pointer;
}

.bg-sw__dot {
	width: 46%;
	height: 46%;
	border-radius: 50%;
	background: var(--bg-card);
	pointer-events: none;
}

/* Поле коду кольору — та сама «коробка», що й решта полів вводу, лише компактніша */
.bg-hex {
	display: flex;
	align-items: center;
	gap: 4px;
	height: 34px;
	margin-top: 11px;
	padding: 0 10px;
	border: 1px solid var(--border-light);
	border-radius: var(--radius-sm);
	background: var(--bg-soft);
	transition: border-color 0.13s;
}

.bg-hex:focus-within {
	border-color: var(--accent);
}

.bg-hex__hash {
	font-size: 12.5px;
	color: var(--text-muted);
}

.bg-hex__input {
	width: 100%;
	min-width: 0;
	border: none;
	background: none;
	font-size: 12.5px;
	letter-spacing: 0.08em;
	color: var(--text);
	text-transform: uppercase;
}

.bg-hex__input:focus {
	outline: none;
}

.bg-pop__note {
	margin: 11px 0 0;
	font-size: 11.5px;
	line-height: 1.45;
	color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
	.ctrl-bg.is-hint .ctrl-bg__ring {
		animation: none;
	}

	.bg-pop {
		animation: none;
	}
}

/* Панель дій */
.pc-actions-col {
	display: flex;
	flex-direction: column;
	gap: 10px;
	max-width: 480px;
}

.pc-model-btn {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 15px 18px;
	background: var(--accent);
	color: var(--on-accent);
	font-size: 15px;
	font-weight: 700;
	border-radius: var(--radius);
	text-align: left;
	transition: background 0.15s;
}

.pc-model-btn:hover {
	background: var(--accent-hover);
}

.pc-action {
	display: flex;
	align-items: center;
	gap: 13px;
	padding: 11px 14px;
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	font-size: 14px;
	font-weight: 600;
	color: var(--text-soft);
	text-align: left;
	transition: all 0.14s;
}

.pc-action:hover {
	border-color: var(--accent);
	color: var(--accent);
}

/* Неактивний інструмент (модель не вибрана): пунктирна «заготовка» замість живої кнопки */
.pc-action.is-locked {
	background: transparent;
	border-style: dashed;
	color: var(--text-muted);
}

.pc-action.is-locked .pc-action__icon {
	background: var(--bg-elevated);
	color: var(--text-muted);
}

.pc-action.is-locked:hover {
	border-color: var(--accent);
	color: var(--text-soft);
}

.pc-action.is-locked:hover .pc-action__icon {
	background: var(--accent-soft);
	color: var(--accent);
}

/* Підказка під кнопкою моделі — пояснює приглушені інструменти */
.pc-locked-note {
	display: flex;
	align-items: center;
	gap: 7px;
	margin: -2px 0 0;
	padding: 0 2px;
	font-size: 12.5px;
	line-height: 1.4;
	color: var(--text-muted);
}

.pc-locked-note svg {
	flex-shrink: 0;
	color: var(--accent);
}

.pc-action__icon {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 10px;
	background: var(--accent-soft);
	color: var(--accent);
	flex-shrink: 0;
}

/* Розділена кнопка тексту: «+ додати» | «редагувати …» */
.pc-action--split {
	align-items: stretch;
	gap: 0;
	padding: 0;
	overflow: hidden;
}

.pc-action__add {
	display: flex;
	align-items: center;
	padding: 11px 12px;
	border-right: 1px solid var(--border);
	color: var(--text-soft);
	transition: color 0.14s;
}

.pc-action__add:hover {
	color: var(--accent);
}

.pc-action__plus {
	position: absolute;
	top: -5px;
	right: -5px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 17px;
	height: 17px;
	border-radius: 50%;
	background: var(--accent);
	color: var(--on-accent);
	font-size: 13px;
	font-weight: 800;
	line-height: 1;
}

.pc-action__edit {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 1;
	min-width: 0;
	padding: 11px 14px;
	color: var(--text-soft);
	font-size: 14px;
	font-weight: 600;
	text-align: left;
	transition: color 0.14s;
}

.pc-action__edit:hover {
	color: var(--accent);
}

.pc-action__edit-txt {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Заголовок картки панелі (шари, інструкція) */
.pc-panel-title {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	padding: 4px 6px 10px;
	font-size: 13px;
	font-weight: 700;
	color: var(--text-soft);
}

.pc-panel-title svg {
	color: var(--accent);
}

/* Шари */
.pc-layers {
	padding: 10px;
}

.pc-layers__clear {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	margin-left: auto;
	font-size: 11.5px;
	font-weight: 600;
	color: var(--text-muted);
	transition: color 0.14s;
}

.pc-layers__clear:hover,
.pc-layers__clear.is-armed {
	color: var(--danger);
}

.pc-layer {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 8px;
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: background 0.12s;
}

.pc-layer:hover {
	background: var(--bg-elevated);
}

.pc-layer.is-active {
	background: var(--accent-soft);
}

/* Схований шар лишається в списку, але видно, що на макет він не йде */
.pc-layer.is-hidden .pc-layer__thumb,
.pc-layer.is-hidden .pc-layer__name {
	opacity: 0.4;
}

.pc-layer.is-hidden .pc-layer__name {
	text-decoration: line-through;
}

.pc-layer__thumb {
	width: 34px;
	height: 34px;
	object-fit: cover;
	border-radius: 7px;
	background: var(--img-bg);
	flex-shrink: 0;
}

.pc-layer__thumb--text {
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 800;
	color: var(--accent);
	background: var(--bg-elevated);
}

.pc-layer__name {
	flex: 1;
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pc-layer__actions {
	display: flex;
	align-items: center;
	gap: 2px;
	flex-shrink: 0;
}

.pc-layer__btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	color: var(--text-muted);
	border-radius: var(--radius-sm);
	transition: all 0.12s;
}

.pc-layer__btn:hover:not(:disabled) {
	background: var(--bg-card);
	color: var(--accent);
}

.pc-layer__btn:disabled {
	opacity: 0.3;
	cursor: default;
}

.pc-layer__btn--del:hover:not(:disabled) {
	color: var(--danger);
}

/* Вимкнене «око» світиться акцентом: одразу видно, який шар не потрапить у друк */
.pc-layer__btn.is-off {
	color: var(--accent);
}

/* Інструкція «як це працює» — тільки поки конструктор заблоковано */
.pc-steps {
	padding: 10px;
}

.pc-steps__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 0;
	padding: 0 6px 4px;
	list-style: none;
}

.pc-step {
	display: flex;
	gap: 11px;
}

.pc-step__num {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 23px;
	height: 23px;
	border-radius: 50%;
	background: var(--accent-soft);
	color: var(--accent);
	font-size: 12px;
	font-weight: 800;
}

.pc-step__body {
	font-size: 12.5px;
	line-height: 1.45;
	color: var(--text-muted);
}

.pc-step__body b {
	display: block;
	font-size: 13.5px;
	color: var(--text-soft);
}

/* Купівля */
.pc-buy {
	padding: 16px;
}

.pc-buy__prices {
	display: flex;
	align-items: baseline;
	gap: 12px;
	margin-bottom: 12px;
}

.pc-buy__price {
	font-size: 26px;
	font-weight: 800;
	color: var(--accent);
}

.pc-buy__price-old {
	font-size: 15px;
	color: var(--text-muted);
	text-decoration: line-through;
}

/* ---------- SEO-блоки під конструктором ---------- */
.pc-block {
	margin-top: 34px;
}

.pc-block__note {
	margin: -6px 0 16px;
	font-size: 14px;
	line-height: 1.5;
}

/* Поки вантажаться дизайни іншої теми — приглушуємо сітку (миттєвий відгук на клік) */
.products-grid {
	transition: opacity 0.15s;
}

.products-grid.is-switching {
	opacity: 0.45;
	pointer-events: none;
}

.pc-models {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.pc-models__more {
	font-weight: 700;
	color: var(--accent);
}

.pc-links {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 30px;
	padding-top: 18px;
	border-top: 1px solid var(--border);
}

.pc-links__label {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-muted);
}

@media (max-width: 1100px) {
	/* Білий блок і панель дій — стовпцем, по центру (без розтягування) */
	.pc-layout {
		grid-template-columns: 1fr;
		justify-items: center;
	}

	.pc-editor,
	.pc-actions-col {
		width: 100%;
		max-width: 540px;
	}
}

@media (max-width: 640px) {
	/* На телефоні панель так само вмонтована праворуч; усе компактніше */
	.pc-stage-col {
		padding: 10px;
	}

	.pc-controls-col {
		padding: 8px 6px;
	}

	.ctrl-btn {
		width: 38px;
		height: 38px;
	}

	.ctrl-bg {
		width: 38px;
	}

	/* Палітра стає нижньою шторкою: поповер шириною 246px тут просто не має де стати,
	   а свотчі на всю ширину екрана нарешті потрапляють під палець */
	.bg-scrim {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 40;
		background: var(--overlay);
	}

	.bg-pop {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 41;
		width: auto;
		padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
		border-width: 1px 0 0;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}

	.bg-pop__title {
		font-size: 15px;
	}

	.bg-pop__grid {
		gap: 10px;
	}

	/* 16px — інакше iOS зумить сторінку на фокусі поля */
	.bg-hex {
		height: 42px;
	}

	.bg-hex__hash,
	.bg-hex__input {
		font-size: 16px;
	}

	.bg-pop__note {
		font-size: 12.5px;
	}
}
</style>
