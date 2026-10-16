// Альфапринт на моделі: /img/print/{модель}/{принт}-{кадр}.webp — замість файлів, які генерує
// адмінка (products/big|thumb). Кеш — .cache/alphaprint; обробник спільний з /img/neoprint: server/utils/caseImage.ts
export default defineCaseImageHandler('alphaprint')
