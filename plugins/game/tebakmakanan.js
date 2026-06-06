import { games } from '../../src/lib/ourin-games.js'

games.register('tebakmakanan', {
    alias: ['makanan', 'food'],
    emoji: '🍲',
    title: 'TEBAK MAKANAN',
    description: 'Tebak nama makanan dari gambar',
    hasImage: true,
    timeout: 60000
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakmakanan')
export { pluginConfig as config, handler, answerHandler }
