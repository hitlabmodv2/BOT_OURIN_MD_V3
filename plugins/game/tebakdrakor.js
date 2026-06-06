import { games } from '../../src/lib/ourin-games.js'

games.register('tebakdrakor', {
    alias: ['drakor', 'kdrama'],
    emoji: '🇰🇷',
    title: 'TEBAK DRAKOR',
    description: 'Tebak judul drama Korea dari sinopsis',
    hasImage: false
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakdrakor')
export { pluginConfig as config, handler, answerHandler }
